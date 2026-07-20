import { useEffect } from 'react';

export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--in');
            io.unobserve(entry.target); // fire once
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}
