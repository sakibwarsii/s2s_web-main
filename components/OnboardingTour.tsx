"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function OnboardingTour() {
  const isStarted = useRef(false);

  useEffect(() => {
    // Disable driver.js modal on mobile screens (< 768px) to prevent locking UI
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      localStorage.setItem("has_seen_tour", "true");
      return;
    }

    const hasSeenTour = localStorage.getItem("has_seen_tour");
    if (hasSeenTour || isStarted.current) return;
    
    isStarted.current = true;

    const tour = driver({
      showProgress: true,
      animate: true,
      doneBtnText: 'Done',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      popoverClass: 'driverjs-theme',
      showButtons: ['next', 'previous', 'close'],
      
      steps: [
        {
          popover: {
            title: 'Welcome to Signova! 👋',
            description: 'Let me give you a quick tour of how to use this platform. You can skip this anytime by clicking outside or hitting Escape.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#tour-mic',
          popover: {
            title: 'Voice Translation',
            description: 'Click this microphone to start speaking. The AI will translate your voice into real-time Sign Language!',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#tour-ai-tools',
          popover: {
            title: 'Upload & Demos',
            description: 'Upload PDF documents, generate lessons, or try our instant pre-recorded demo classes here.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#tour-screenshare',
          popover: {
            title: 'Present Screen',
            description: 'Share your screen or a specific window to the classroom board.',
            side: 'top',
            align: 'start'
          }
        }
      ],
      onDestroyed: () => {
        localStorage.setItem("has_seen_tour", "true");
      },
      onCloseClick: () => {
         localStorage.setItem("has_seen_tour", "true");
         tour.destroy();
      }
    });

    setTimeout(() => {
      tour.drive();
    }, 1000);
    
  }, []);

  return null;
}


