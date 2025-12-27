import { useState, useEffect } from "react";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Demo from "./components/Demo";
import About from "./components/About";
import "./App.css";

function App() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="app">
      <Hero scrollY={scrollY} />
      <Features />
      <Demo />
      <About />
    </div>
  );
}

export default App;
