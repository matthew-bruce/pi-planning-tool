import './globals.css';
import 'reactflow/dist/style.css';
import { DispatchShell } from '@/components/DispatchShell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DispatchShell>{children}</DispatchShell>
      </body>
    </html>
  );
}
