
import { useState, useEffect, useRef } from "react";



export default function useChatScroll(messages) {

  const [isScrolling, setIsScrolling] = useState(false);

  const scrollContainerRef = useRef(null);

  const scrollTimeoutRef = useRef(null);

  const isEditingActionRef = useRef(false);



  const hasMessages = messages.length > 0;



  // Scroll Stabilization Engine

  useEffect(() => {

    if (hasMessages && scrollContainerRef.current) {

      if (isEditingActionRef.current) {

        isEditingActionRef.current = false;

        return;

      }

      scrollContainerRef.current.scrollTo({

        top: scrollContainerRef.current.scrollHeight,

        behavior: "smooth",

      });

    }

  }, [messages, hasMessages]);



  // Track Scroll activity to manage disappearing visibility triggers

  useEffect(() => {

    const container = scrollContainerRef.current;

    if (!container) return;



    const handleScroll = () => {

      setIsScrolling(true);

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);



      scrollTimeoutRef.current = setTimeout(() => {

        setIsScrolling(false);

      }, 1200); // Disappears after 1.2 seconds of zero movement

    };



    container.addEventListener("scroll", handleScroll);

    return () => {

      container.removeEventListener("scroll", handleScroll);

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    };

  }, [hasMessages]);



  return { scrollContainerRef, isScrolling, isEditingActionRef };

}

