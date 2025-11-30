"use client";
import React, { useState } from 'react';

const isEmailValid = (email) => {
  const re = /^[a-zA-Z0-9._-]+@(gmail\.com|yandex\.(ru|com|by|kz))$/;
  return re.test(String(email).toLowerCase());
};

const ContactForm = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    e.target.value = null;
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!isEmailValid(email)) {
      setStatus('Некорректная почта. Поддерживаются только Gmail и Yandex.');
      return;
    }
    if (message.trim().length < 10) {
      setStatus('Сообщение должно быть не менее 10 символов.');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('message', message);
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/telegram', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setStatus('✅ Сообщение успешно отправлено! Мы свяжемся с вами.');
        setEmail('');
        setMessage('');
        setFiles([]);
      } else {
        const errorData = await response.json();
        setStatus(`❌ Ошибка отправки: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      setStatus('❌ Произошла ошибка сети при отправке.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-rzd-white" id="contact">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-center mb-12 text-gray-900">
          Свяжитесь с <span className="text-rzd-red">нами</span>
        </h2>
        <form onSubmit={handleSubmit} className="bg-rzd-gray p-8 rounded-xl shadow-2xl border-t-4 border-rzd-red">
          
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Ваша Почта (только Gmail/Yandex)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-rzd-red focus:border-rzd-red transition duration-300"
              placeholder="example@gmail.com"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Сообщение
            </label>
            <div className="relative">
              <textarea
                id="message"
                rows="5"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-rzd-red focus:border-rzd-red transition duration-300 pr-12"
                placeholder="Расскажите о себе или задайте вопрос..."
                required
              ></textarea>
              
              <label 
                htmlFor="file-upload" 
                className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center bg-rzd-red text-white rounded-full cursor-pointer hover:bg-rzd-red/90 transition duration-300 shadow-md"
              >
                +
                <input 
                  id="file-upload" 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileChange} 
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mb-6 p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm font-medium mb-2 text-gray-700">Прикрепленные файлы:</p>
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-gray-100 p-2 rounded-full text-xs">
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)} 
                      className="text-rzd-red hover:text-red-700 transition duration-150"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status && (
            <p className={`mb-4 text-center text-sm font-medium ${status.startsWith('❌') ? 'text-red-600' : 'text-green-600'}`}>
              {status}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg text-lg font-semibold transition duration-300 transform 
              ${isSubmitting ? 'bg-rzd-red/60 cursor-not-allowed' : 'bg-rzd-red text-white hover:bg-rzd-red/90 hover:scale-[1.01] shadow-xl'}
            `}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить Сообщение'}
          </button>

        </form>
      </div>
    </section>
  );
};

export default ContactForm;
