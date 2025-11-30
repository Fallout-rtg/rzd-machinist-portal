import './globals.css';

export const metadata = {
  title: 'Демо-портал машиниста | РЖД',
  description: 'Современный информационный портал о профессии машиниста поезда в России. Карьера, история, техника.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="bg-rzd-white text-gray-800 antialiased">
        {children}
      </body>
    </html>
  );
}
