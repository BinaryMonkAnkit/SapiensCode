import "./App.css";
import MainLayout from "./components/PageLayout/MainLayout";

function App() {
  return (
    <div>
      <MainLayout />
    </div>
  );
}

// function App() {
//   return (
//     <div
//       className="
//         h-screen w-screen
//         bg-neutral-800
//         bg-cover bg-center bg-no-repeat
//         fixed
//         overflow-hidden
//       "
//     >
//       <div
//         className="
//           h-full w-full
//           overflow-y-auto
//           bg-neutral-880
//           backdrop-blur-sm
//           rounded-xl
//         "
//       >
//         {/* <Demo /> */}
//         {/* <SearchBar /> */}
//         {/* <CodeEditor /> */}

//         <div className="h-[2000px] mt-6">
//           {/* Extra content to test scrolling */}
//           <p className="text-black text-xl">Scroll down...</p>
//         </div>
//       </div>
//     </div>
//   );
// }

export default App;
