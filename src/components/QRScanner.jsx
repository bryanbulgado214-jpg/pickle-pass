import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { C } from '../lib/constants';

export default function QRScanner({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      startDetection();
    } catch (e) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  }

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }

  function startDetection() {
    if (!('BarcodeDetector' in window)) {
      intervalRef.current = setInterval(() => scanFrame(), 500);
      return;
    }
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          handleScan(barcodes[0].rawValue);
        }
      } catch (_) {}
    }, 300);
  }

  function scanFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
  }

  async function handleScan(raw) {
    if (result) return;
    clearInterval(intervalRef.current);
    setScanning(false);

    const parts = raw.split(':');
    if (parts[0] !== 'pp' || parts[1] !== 'checkin' || parts.length < 4) {
      setResult({ ok: false, message: 'Invalid QR code. Not a Pickle Pass check-in code.' });
      return;
    }

    const sessionId = parts[2];
    const participantId = parts[3];

    const { data: participant, error: err } = await supabase
      .from('session_participants')
      .select('*, profiles:profile_id(full_name, photo_url), session:session_id(label)')
      .eq('id', participantId)
      .single();

    if (err || !participant) {
      setResult({ ok: false, message: 'Player not found. Invalid check-in code.' });
      return;
    }

    if (participant.session_id !== sessionId) {
      setResult({ ok: false, message: 'This code is for a different session.' });
      return;
    }

    if (participant.checked_in) {
      setResult({
        ok: true,
        already: true,
        name: participant.profiles?.full_name || 'Player',
        session: participant.session?.label || 'Session',
      });
      return;
    }

    await supabase
      .from('session_participants')
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq('id', participantId);

    setResult({
      ok: true,
      already: false,
      name: participant.profiles?.full_name || 'Player',
      session: participant.session?.label || 'Session',
    });
  }

  function handleManualInput() {
    const code = prompt('Paste the QR code value:');
    if (code) handleScan(code);
  }

  function resetScan() {
    setResult(null);
    setScanning(true);
    startDetection();
  }

  return (
    <div className="pane">
      <button className="back" onClick={() => { stopCamera(); onBack(); }}>{"← Back"}</button>
      <div className="paneHead">
        <div className="h1">CHECK-IN SCANNER</div>
        <div className="sub">Scan player QR codes to confirm attendance</div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {!result && (
        <div className="scannerWrap">
          <video ref={videoRef} className="scannerVideo" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="scannerOverlay">
            <div className="scannerFrame" />
          </div>
          {scanning && <div className="scannerHint">Point camera at player{"'"}s QR code</div>}
          <button className="ghostBtn" style={{ marginTop: 12 }} onClick={handleManualInput}>
            Enter code manually
          </button>
        </div>
      )}

      {result && (
        <div className={`scanResult ${result.ok ? 'scanOk' : 'scanFail'}`}>
          <div className="scanResultIcon">{result.ok ? (result.already ? '🔄' : '✅') : '❌'}</div>
          <div className="scanResultTitle">
            {result.ok
              ? result.already
                ? 'Already Checked In'
                : 'Check-In Confirmed!'
              : 'Invalid Code'}
          </div>
          {result.ok && (
            <>
              <div className="scanResultName">{result.name}</div>
              <div className="scanResultSession">{result.session}</div>
            </>
          )}
          {!result.ok && <div className="scanResultMsg">{result.message}</div>}
          <button className="cta" onClick={resetScan}>Scan Another</button>
        </div>
      )}
    </div>
  );
}
