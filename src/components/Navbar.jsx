import React from 'react';

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-rzd-white bg-opacity-95 shadow-lg backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <a href="#home" className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-rzd-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 17l10 5 10-5M2 17l10-5 10 5M2 17V7l10-5 10 5v10" />
              <polyline points="9 10 12 12 15 10" />
            </svg>
            <span className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">Машинист РЖД</span>
          </a>
          <div className="flex space-x-6">
            <a href="#locomotives" className="text-gray-600 hover:text-rzd-red transition duration-300 font-medium">Локомотивы</a>
            <a href="#career" className="text-gray-600 hover:text-rzd-red transition duration-300 font-medium">Карьера</a>
            <a href="#contact" className="text-rzd-red font-semibold hover:opacity-80 transition duration-300 border-b-2 border-rzd-red">Связь</a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
