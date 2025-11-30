"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LocomotiveCard from './LocomotiveCard';

const LOCOMOTIVES = [
  { name: 'ЧС2', type: 'Электровоз', year: '1958', history: 'Легенда пассажирских перевозок СССР, прозванный "Чебурашка" за свои характерные округлые формы. Символ эпохи электрификации.', file: 'chs2.jpg' },
  { name: 'ВЛ80С', type: 'Электровоз', year: '1961', history: 'Самый массовый грузовой электровоз переменного тока. Надежный "тягач" советских и российских железных дорог на протяжении десятилетий.', file: 'vl80s.jpg' },
  { name: '2ТЭ25КМ', type: 'Тепловоз', year: '2014', history: 'Современный грузовой тепловоз, разработанный для тяжелых условий. Мощность и экономичность для неэлектрифицированных линий.', file: '2te25km.jpg' },
  { name: 'ЭП20', type: 'Электровоз', year: '2011', history: 'Двухсистемный скоростной пассажирский локомотив. Способен работать как на постоянном, так и на переменном токе. Разработан для скоростного движения.', file: 'ep20.jpg' },
  { name: '"Ласточка" (ЭС2Г)', type: 'Электропоезд', year: '2014', history: 'Современный высокотехнологичный электропоезд, используемый для пригородных и межрегиональных экспресс-маршрутов.', file: 'lastochka.jpg' },
];

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % LOCOMOTIVES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 7000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const goToSlide = (index) => {
    setIsPaused(true);
    setCurrentIndex(index);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const wrapIndex = (index) => {
    return (index % LOCOMOTIVES.length + LOCOMOTIVES.length) % LOCOMOTIVES.length;
  };

  const getCardPosition = (index) => {
    const diff = index - currentIndex;
    const wrappedDiff = wrapIndex(diff);
    
    if (wrappedDiff === 0) return 'center';
    if (wrappedDiff === 1 || wrappedDiff === LOCOMOTIVES.length - 1) return 'near';
    if (wrappedDiff === 2 || wrappedDiff === LOCOMOTIVES.length - 2) return 'far';
    return 'hidden';
  };

  const getVariants = (position) => {
    const baseScale = { initial: 0.8, center: 1, near: 0.9, far: 0.8, hidden: 0.7 };
    const baseTranslateX = { 
        initial: "0%", 
        center: "0%", 
        near: "30%", 
        far: "55%", 
        hidden: "70%" 
    };
    const baseZ = { initial: -100, center: 50, near: 0, far: -50, hidden: -100 };
    const baseRotateY = { initial: 0, center: 0, near: -10, far: -15, hidden: -20 };
    const baseOpacity = { initial: 0, center: 1, near: 0.8, far: 0.4, hidden: 0 };
    
    const mobileTranslateX = { 
        initial: "0%", 
        center: "0%", 
        near: "20%", 
        far: "35%", 
        hidden: "50%" 
    };
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return {
      center: {
        scale: 1,
        x: 0,
        z: 50,
        rotateY: 0,
        opacity: 1,
        zIndex: 100,
        filter: "grayscale(0%)",
        transition: { type: "spring", stiffness: 300, damping: 30 },
      },
      near: (isNext) => ({
        scale: baseScale.near,
        x: isMobile ? (isNext ? mobileTranslateX.near : `-${mobileTranslateX.near}`) : (isNext ? baseTranslateX.near : `-${baseTranslateX.near}`),
        z: baseZ.near,
        rotateY: isNext ? baseRotateY.near : -baseRotateY.near,
        opacity: baseOpacity.near,
        zIndex: 50,
        filter: "grayscale(30%)",
        transition: { type: "spring", stiffness: 300, damping: 30 },
      }),
      far: (isNext) => ({
        scale: baseScale.far,
        x: isMobile ? (isNext ? mobileTranslateX.far : `-${mobileTranslateX.far}`) : (isNext ? baseTranslateX.far : `-${baseTranslateX.far}`),
        z: baseZ.far,
        rotateY: isNext ? baseRotateY.far : -baseRotateY.far,
        opacity: baseOpacity.far,
        zIndex: 25,
        filter: "grayscale(50%)",
        transition: { type: "spring", stiffness: 300, damping: 30 },
      }),
      hidden: (isNext) => ({
        scale: baseScale.hidden,
        x: isMobile ? (isNext ? mobileTranslateX.hidden : `-${mobileTranslateX.hidden}`) : (isNext ? baseTranslateX.hidden : `-${baseTranslateX.hidden}`),
        z: baseZ.hidden,
        rotateY: isNext ? baseRotateY.hidden : -baseRotateY.hidden,
        opacity: baseOpacity.hidden,
        zIndex: 10,
        filter: "grayscale(70%)",
        transition: { type: "spring", stiffness: 300, damping: 30 },
      }),
    };
  };

  return (
    <div className="py-16 md:py-24 bg-rzd-gray overflow-hidden" id="locomotives">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-center mb-12 text-gray-900">
          Техника <span className="text-rzd-red">наших дорог</span>
        </h2>
        
        <div 
          className="relative h-[450px] md:h-[550px] w-full"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ perspective: '1200px' }}
        >
          {LOCOMOTIVES.map((loco, index) => {
            const position = getCardPosition(index);
            const isCurrent = index === currentIndex;
            const isNext = wrapIndex(index - currentIndex) < LOCOMOTIVES.length / 2;
            
            if (position === 'hidden' && !isCurrent) return null;

            return (
              <motion.div
                key={loco.name}
                className={`absolute w-10/12 sm:w-8/12 md:w-6/12 lg:w-5/12 mx-auto left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer 
                  ${isCurrent ? 'z-50' : 'z-10'}
                `}
                custom={isNext}
                initial="hidden"
                animate={position}
                variants={getVariants(position)}
                onClick={() => goToSlide(index)}
              >
                <LocomotiveCard locomotive={loco} isCurrent={isCurrent} />
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center space-x-3 mt-12">
          {LOCOMOTIVES.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                w-3 h-3 rounded-full transition-all duration-300 ease-in-out
                ${index === currentIndex ? 'bg-rzd-red w-6 shadow-md' : 'bg-gray-400/50 hover:bg-rzd-red/50'}
              `}
              aria-label={`Перейти к локомотиву ${LOCOMOTIVES[index].name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Carousel;
