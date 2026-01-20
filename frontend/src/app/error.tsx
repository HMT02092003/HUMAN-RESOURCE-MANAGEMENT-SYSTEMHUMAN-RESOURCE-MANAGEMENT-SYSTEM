'use client';

import { Result, Button } from 'antd';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Result
        status="500"
        title="500"
        subTitle="Xin lỗi, đã xảy ra lỗi không mong muốn."
        extra={
          <Button type="primary" onClick={reset}>
            Thử lại
          </Button>
        }
      />
    </div>
  );
}
