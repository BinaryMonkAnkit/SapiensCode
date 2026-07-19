// Adjust these image paths relative to wherever this file actually lives
// in your project (this assumes src/components/Documentation/data/).
import pythonImg from "../../../assets/programmingLang/python.png";
import jsImg from "../../../assets/programmingLang/js.png";
import cImg from "../../../assets/programmingLang/c.png";
import cppImg from "../../../assets/programmingLang/cpp.png";
import javaImg from "../../../assets/programmingLang/java.png";

export const languageOptions = [
  {
    key: "python",
    label: "Python",
    icon: pythonImg,
    url: "https://docs.python.org/3/",
  },
  {
    key: "js",
    label: "JavaScript",
    icon: jsImg,
    url: "https://devdocs.io/javascript/",
  },
  { key: "c", label: "C", icon: cImg, url: "https://en.cppreference.com/c" },
  {
    key: "cpp",
    label: "C++",
    icon: cppImg,
    url: "https://en.cppreference.com/cpp",
  },
  {
    key: "java",
    label: "Java",
    icon: javaImg,
    url: "https://docs.oracle.com/en/java/",
  },
];
