import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipTextProps {
  words: string[];
  duration?: number;
  letterDelay?: number;
  wordDelay?: number;
  className?: string;
}

export const FlipText: React.FC<FlipTextProps> = ({
  words,
  duration = 3000,
  letterDelay = 0.05,
  wordDelay = 0.3,
  className = '',
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayedWord, setDisplayedWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    if (!currentWord) return;

    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      // Typing effect
      if (currentLetterIndex < currentWord.length) {
        timeout = setTimeout(() => {
          setDisplayedWord(currentWord.substring(0, currentLetterIndex + 1));
          setCurrentLetterIndex(currentLetterIndex + 1);
        }, letterDelay * 1000);
      } else {
        // Word is complete, wait before deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, duration);
      }
    } else {
      // Deleting effect
      if (currentLetterIndex > 0) {
        timeout = setTimeout(() => {
          setDisplayedWord(currentWord.substring(0, currentLetterIndex - 1));
          setCurrentLetterIndex(currentLetterIndex - 1);
        }, letterDelay * 50); // Faster deletion
      } else {
        // Word is deleted, move to next word
        timeout = setTimeout(() => {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
          setCurrentLetterIndex(0);
          setDisplayedWord('');
        }, wordDelay * 1000);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentWordIndex, currentLetterIndex, isDeleting, words, duration, letterDelay, wordDelay]);

  const currentWord = words[currentWordIndex] || '';

  const hasGradient = className.includes('gradient');

  return (
    <span className={`inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={`${currentWordIndex}-${displayedWord}`}
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            filter: 'blur(0px)',
            backgroundPosition: hasGradient ? ['0% 50%', '100% 50%', '0% 50%'] : undefined,
          }}
          exit={{ opacity: 0, y: -20, filter: 'blur(10px)', scale: 0.8 }}
          transition={{ 
            duration: 0.3,
            backgroundPosition: hasGradient ? { duration: 8, ease: 'linear', repeat: Infinity } : undefined,
          }}
          className={`inline-block ${hasGradient ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-500' : ''}`}
          style={hasGradient ? { backgroundSize: '200% 200%' } : {}}
        >
          {displayedWord}
          {!isDeleting && currentLetterIndex < currentWord.length && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className={`inline-block w-[2px] h-[1em] ml-1 align-middle ${hasGradient ? 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-500' : 'bg-current'}`}
            />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
