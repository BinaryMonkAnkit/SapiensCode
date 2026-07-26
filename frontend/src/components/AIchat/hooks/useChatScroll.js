
// import { useState, useEffect, useRef } from "react";



// export default function useChatScroll(messages) {

//   const [isScrolling, setIsScrolling] = useState(false);

//   const scrollContainerRef = useRef(null);

//   const scrollTimeoutRef = useRef(null);

//   const isEditingActionRef = useRef(false);



//   const hasMessages = messages.length > 0;



//   // Scroll Stabilization Engine

//   useEffect(() => {

//     if (hasMessages && scrollContainerRef.current) {

//       if (isEditingActionRef.current) {

//         isEditingActionRef.current = false;

//         return;

//       }

//       scrollContainerRef.current.scrollTo({

//         top: scrollContainerRef.current.scrollHeight,

//         behavior: "smooth",

//       });

//     }

//   }, [messages, hasMessages]);



//   // Track Scroll activity to manage disappearing visibility triggers

//   useEffect(() => {

//     const container = scrollContainerRef.current;

//     if (!container) return;



//     const handleScroll = () => {

//       setIsScrolling(true);

//       if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);



//       scrollTimeoutRef.current = setTimeout(() => {

//         setIsScrolling(false);

//       }, 1200); // Disappears after 1.2 seconds of zero movement

//     };



//     container.addEventListener("scroll", handleScroll);

//     return () => {

//       container.removeEventListener("scroll", handleScroll);

//       if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

//     };

//   }, [hasMessages]);



//   return { scrollContainerRef, isScrolling, isEditingActionRef };

// }


// Baseline hook - NO observers, NO complexity
// import { useEffect, useRef } from "react";

// export default function useChatScroll(messages, isStreaming) {
//   const scrollContainerRef = useRef(null);

//   // -------------------------------------------------------------
//   // STEP 3: Baseline Scroll (Runs on every message chunk update)
//   // -------------------------------------------------------------
//   useEffect(() => {
//     const el = scrollContainerRef.current;
//     if (el) {
//       el.scrollTop = el.scrollHeight;
//     }
//   }, [messages]);

//   // -------------------------------------------------------------
//   // STEP 4: Code Block Fix (MutationObserver for syntax rendering)
//   // -------------------------------------------------------------
//   useEffect(() => {
//     if (!isStreaming) return;

//     const container = scrollContainerRef.current;
//     if (!container) return;

//     // Catches syntax highlighting / DOM expansion that happens 
//     // AFTER React has finished rendering the chunk text
//     const observer = new MutationObserver(() => {
//       container.scrollTop = container.scrollHeight;
//     });

//     observer.observe(container, {
//       childList: true,
//       subtree: true,
//       characterData: true,
//     });

//     // Cleanup: Disconnects ONLY when streaming completes (isStreaming -> false)
//     return () => observer.disconnect();
//   }, [isStreaming]); // Depend ONLY on isStreaming, NOT messages!

//   return { scrollContainerRef };
// }