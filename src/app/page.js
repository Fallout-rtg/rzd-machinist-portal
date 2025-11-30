import Navbar from '@/components/Navbar';
import LocomotiveCarousel from '@/components/LocomotiveCarousel';
import ContactForm from '@/components/ContactForm';
import Image from 'next/image';

export default function Home() {
  return (
    <main>
      <Navbar />

      {/* Intro Section */}
      <section 
        id="home" 
        className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-rzd-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight mb-4">
            <span className="text-gray-900">Демо-портал</span> <br className="sm:hidden" />
            <span className="text-rzd-red block">Машиниста</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 font-light max-w-3xl mx-auto">
            Ваш путеводитель в мир современных и исторических локомотивов, карьерных возможностей и обучения в сфере <span className="font-semibold">Российских Железных Дорог</span>.
          </p>
          <a 
            href="#locomotives" 
            className="mt-8 inline-block px-8 py-3 bg-rzd-red text-white text-lg font-semibold rounded-full shadow-lg hover:bg-rzd-red/90 transition duration-300 transform hover:scale-105"
          >
            Изучить Локомотивы
          </a>
        </div>
        
        {/* Фоновый элемент - колесная пара */}
        <div className="absolute top-0 right-0 opacity-10 blur-sm w-full h-full flex items-center justify-center">
          <svg className="w-96 h-96 sm:w-[500px] sm:h-[500px] lg:w-[800px] lg:h-[800px] text-rzd-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </section>

      <LocomotiveCarousel />

      {/* Career Section */}
      <section className="py-16 md:py-24 bg-rzd-white" id="career">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-center mb-12 text-gray-900">
            Как стать <span className="text-rzd-red">Машинистом</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Блок 1: Образование */}
            <div className="p-6 bg-rzd-gray rounded-xl shadow-lg border-l-4 border-rzd-red hover:shadow-xl transition duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">1. Получение образования</h3>
              <p className="text-gray-700">
                Основной путь — это среднее профессиональное образование в **железнодорожных колледжах и техникумах** (например, специальности «Эксплуатация и ремонт локомотивов»). Поступить можно после 9 или 11 класса.
              </p>
              <ul className="mt-3 list-disc list-inside text-sm text-gray-600">
                <li>МИИТ (филиалы)</li>
                <li>Петербургский ГУПС (колледж)</li>
                <li>Уральский техникум железнодорожного транспорта</li>
              </ul>
            </div>
            
            {/* Блок 2: Помощник машиниста */}
            <div className="p-6 bg-rzd-gray rounded-xl shadow-lg border-l-4 border-rzd-red hover:shadow-xl transition duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">2. Работа Помощником</h3>
              <p className="text-gray-700">
                После окончания учебного заведения карьера начинается с должности **помощника машиниста**. Это период обязательной практики, изучения техники и получения опыта под руководством машиниста.
              </p>
            </div>
            
            {/* Блок 3: Аттестация */}
            <div className="p-6 bg-rzd-gray rounded-xl shadow-lg border-l-4 border-rzd-red hover:shadow-xl transition duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">3. Аттестация и допуск</h3>
              <p className="text-gray-700">
                После наработки необходимого стажа (обычно от 1 года) и успешного прохождения обучения и строгой медицинской комиссии, помощник сдает **квалификационные экзамены** для получения права управления локомотивом.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ContactForm />
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Демо-портал машиниста. Проект выполнен в стилистике РЖД.</p>
          <p className="mt-1">Технологии: Next.js, React, Framer Motion, Tailwind CSS.</p>
        </div>
      </footer>
    </main>
  );
}
