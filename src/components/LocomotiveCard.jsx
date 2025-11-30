import React from 'react';
import Image from 'next/image';

const LocomotiveCard = ({ locomotive, isCurrent }) => {
  return (
    <div className={`
      relative w-full h-full p-6 transition-all duration-700 ease-out 
      rounded-xl shadow-2xl bg-white border-2 
      ${isCurrent ? 'border-rzd-red/70 shadow-red-glow' : 'border-gray-200/50'}
      transform-style-preserve-3d
    `}>
      <div className="flex flex-col h-full">
        <div className="relative w-full h-64 sm:h-80 mb-4 overflow-hidden rounded-lg">
          <Image
            src={`/images/locomotives/${locomotive.file}`}
            alt={locomotive.name}
            fill={true}
            sizes="(max-width: 768px) 90vw, 50vw"
            className={`transition-transform duration-700 ease-out 
              ${isCurrent ? 'scale-105 rotate-x-0' : 'scale-100 rotate-x-3'} 
              hover:scale-110
            `}
            style={{ 
              transform: `translateZ(20px)`,
              objectFit: 'cover'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        <h3 className={`text-2xl sm:text-3xl font-extrabold mb-2 transition-colors duration-500 
          ${isCurrent ? 'text-rzd-red' : 'text-gray-800'}`
        } style={{ transform: `translateZ(10px)` }}>
          {locomotive.name}
        </h3>
        
        <div className="space-y-1 text-sm sm:text-base flex-grow">
          <p className="flex justify-between items-center text-gray-600"><span className="font-semibold">Тип:</span> {locomotive.type}</p>
          <p className="flex justify-between items-center text-gray-600"><span className="font-semibold">Начало выпуска:</span> {locomotive.year}</p>
        </div>

        <p className={`mt-4 text-sm sm:text-base transition-opacity duration-500 
          ${isCurrent ? 'opacity-100 text-gray-700' : 'opacity-70 text-gray-600'}
        `}>
          {locomotive.history}
        </p>

        {isCurrent && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-rzd-red rounded-full animate-pulse shadow-md"></div>
        )}
      </div>
    </div>
  );
};

export default LocomotiveCard;
