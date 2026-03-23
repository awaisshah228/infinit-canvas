import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Infinite Canvas - Documentation',
  description: 'Documentation for the React Infinite Canvas library',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
