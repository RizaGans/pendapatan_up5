'use client';

import { useEffect } from 'react';
import { animate, stagger } from 'framer-motion';
import { SHELL } from '../components/shell';
import { startApp } from '../lib/ui';

const MOTION_OPTIONS = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1],
};

function stopAnimations(animations) {
  animations.forEach((animation) => animation.stop());
  animations.length = 0;
}

export default function Page() {
  useEffect(() => {
    const app = document.querySelector('.app');
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const pageAnimations = [];
    const activeCardAnimations = new Set();
    const cardAnimations = new WeakMap();
    let pressedCard = null;

    const stopCardAnimation = (card) => {
      const animation = cardAnimations.get(card);
      if (!animation) return;

      animation.stop();
      activeCardAnimations.delete(animation);
      cardAnimations.delete(card);
    };

    const animateCard = (card, values) => {
      stopCardAnimation(card);

      const animation = animate(card, values, {
        type: 'spring',
        stiffness: 420,
        damping: 27,
        mass: 0.65,
      });

      cardAnimations.set(card, animation);
      activeCardAnimations.add(animation);
    };

    const getCard = (event) => event.target.closest?.('.cd');

    const onCardEnter = (event) => {
      if (prefersReducedMotion) return;

      const card = getCard(event);
      if (!card || card.contains(event.relatedTarget)) return;

      animateCard(card, { y: -4, scale: 1.008 });
    };

    const onCardLeave = (event) => {
      if (prefersReducedMotion) return;

      const card = getCard(event);
      if (!card || card.contains(event.relatedTarget)) return;

      animateCard(card, { y: 0, scale: 1 });
    };

    const onCardPress = (event) => {
      if (prefersReducedMotion || event.pointerType === 'mouse') return;

      const card = getCard(event);
      if (!card) return;

      pressedCard = card;
      animateCard(card, { y: -1, scale: 0.985 });
    };

    const onCardRelease = (event) => {
      if (prefersReducedMotion || event.pointerType === 'mouse') return;

      const card = pressedCard;
      pressedCard = null;
      if (card) animateCard(card, { y: 0, scale: 1 });
    };

    const onPageChange = (event) => {
      if (prefersReducedMotion) return;

      stopAnimations(pageAnimations);
      activeCardAnimations.forEach((animation) => animation.stop());
      activeCardAnimations.clear();

      const section = document.getElementById(event.detail);
      if (!section || section.hidden) return;

      const activeNav = document.querySelector('nav button.on');
      if (activeNav) {
        pageAnimations.push(
          animate(activeNav, { scale: [0.97, 1] }, {
            duration: 0.28,
            ease: MOTION_OPTIONS.ease,
          }),
        );
      }

      pageAnimations.push(
        animate(section, { opacity: [0, 1], y: [12, 0] }, MOTION_OPTIONS),
      );

      const cards = section.querySelectorAll('.cd');
      if (cards.length) {
        pageAnimations.push(
          animate(
            cards,
            { opacity: [0, 1], y: [14, 0], scale: [0.99, 1] },
            { ...MOTION_OPTIONS, delay: stagger(0.035) },
          ),
        );
      }

      const chartShapes = section.querySelectorAll(
        '.cd svg path, .cd svg rect, .cd svg circle',
      );
      if (chartShapes.length) {
        pageAnimations.push(
          animate(
            chartShapes,
            { opacity: [0, 1] },
            { duration: 0.45, delay: stagger(0.012), ease: 'easeOut' },
          ),
        );
      }
    };

    app?.addEventListener('pointerover', onCardEnter);
    app?.addEventListener('pointerout', onCardLeave);
    app?.addEventListener('pointerdown', onCardPress);
    window.addEventListener('pointerup', onCardRelease);
    window.addEventListener('pointercancel', onCardRelease);
    window.addEventListener('app:page-change', onPageChange);

    if (!prefersReducedMotion && app) {
      pageAnimations.push(
        animate(app, { y: [8, 0] }, { ...MOTION_OPTIONS, duration: 0.45 }),
      );
    }

    void startApp().catch((error) => {
      console.error('Gagal menginisialisasi aplikasi:', error);
    });

    return () => {
      window.removeEventListener('app:page-change', onPageChange);
      app?.removeEventListener('pointerover', onCardEnter);
      app?.removeEventListener('pointerout', onCardLeave);
      app?.removeEventListener('pointerdown', onCardPress);
      window.removeEventListener('pointerup', onCardRelease);
      window.removeEventListener('pointercancel', onCardRelease);

      stopAnimations(pageAnimations);
      activeCardAnimations.forEach((animation) => animation.stop());
      activeCardAnimations.clear();
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: SHELL }} />;
}
