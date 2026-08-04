import { C } from '../lib/constants';

export default function ShareButton({ title, text, url, label = 'Share', className = '' }) {
  async function handleShare() {
    const shareData = { title, text };
    if (url) shareData.url = url;

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text + (url ? `\n${url}` : ''));
        alert('Copied to clipboard!');
      } catch (_) {}
    }
  }

  return (
    <button className={`shareBtn ${className}`} onClick={handleShare}>
      {"📤"} {label}
    </button>
  );
}
