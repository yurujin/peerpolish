

import React from "react";
import Header from "./components/Header";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div>
      <Header />
      <main className="main-layout">
        <LeftPanel />
        <RightPanel />
      </main>
      <Footer />
    </div>
  );
}

export default App;
