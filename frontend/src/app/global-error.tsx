'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <h2>Đã xảy ra lỗi nghiêm trọng!</h2>
          <button onClick={reset}>Thử lại</button>
        </div>
      </body>
    </html>
  );
}
