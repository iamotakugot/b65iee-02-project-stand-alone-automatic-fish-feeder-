import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [showTeam, setShowTeam] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // ⚡ IMMEDIATE TEAM DISPLAY - No setTimeout delays!
    setShowTeam(true);
    
    // ⚡ IMMEDIATE PROGRESS COMPLETION - Event-driven UI
    setProgress(100);

    // ⚡ COUNTDOWN NAVIGATION - Auto skip after 10 seconds
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          localStorage.setItem("splash-seen", "true");
          
          // Dispatch splash completion event
          const splashCompleteEvent = new CustomEvent('splashComplete');
          window.dispatchEvent(splashCompleteEvent);
          
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Check URL parameter for auto-skip
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('nosplash') === 'true') {
      localStorage.setItem("splash-seen", "true");
      
      // Dispatch splash completion event
      const splashCompleteEvent = new CustomEvent('splashComplete');
      window.dispatchEvent(splashCompleteEvent);
      
      navigate("/");
    }

    return () => clearInterval(countdownInterval);
  }, [navigate]);

  const handleSkip = () => {
    localStorage.setItem("splash-seen", "true");
    
    // Dispatch splash completion event
    const splashCompleteEvent = new CustomEvent('splashComplete');
    window.dispatchEvent(splashCompleteEvent);
    
    navigate("/");
  };

  const teamMembers = [
    { id: "B6523442", name: "นาย ภัทรพงษ์ พิศเพ็ง" },
    { id: "B6523497", name: "นาย สุริวัชร์ แสนทวีสุข" },
    { id: "B6523404", name: "นาย พีรวัฒน์ ทองล้วน" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden font-inter">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-400/30 rounded-full blur-2xl animate-ping delay-500"></div>
      </div>
      
      {/* Skip button with countdown */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={handleSkip}
        className="absolute top-4 right-4 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-sm hover:bg-white/30 transition-colors z-10 border border-white/30 font-semibold"
      >
        ข้าม ({countdown})
      </motion.button>

      {/* Main Container Grid */}
      <div className="min-h-screen grid grid-rows-[1fr_auto] items-center justify-center relative z-10">
        {/* Main Content */}
        <div className="text-center max-w-4xl mx-auto px-6 flex flex-col justify-center">
        {/* University Info - Smaller */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="mb-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg text-xs">
                IEE
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-200 font-medium">วิศวกรรมไฟฟ้าอุตสาหกรรม</div>
                <div className="text-xs text-gray-300">INDUSTRIAL ELECTRICAL</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-200 font-medium">สำนักวิชาวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีสุรนารี</p>
          
          {/* Project Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-lg px-3 py-1 border border-orange-400/30">
              <span className="text-xs text-gray-300">รหัสโปรเจค:</span>
              <span className="text-sm font-bold text-orange-300 tracking-wider">B65IEE02</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Project Title - Smaller */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-2xl">
            Stand-Alone Automatic
          </h1>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl">
            Fish Feeder
          </h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent flex-1 max-w-24"></div>
            <span className="text-sm md:text-base text-gray-200 px-4 font-medium">using IoT</span>
            <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent flex-1 max-w-24"></div>
          </motion.div>
        </motion.div>

        {/* Fish Animation */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-6"
        >
          <div className="text-2xl md:text-4xl animate-bounce">🐟</div>
        </motion.div>

        {/* Team Members - Compact */}
        {showTeam && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <h2 className="text-sm md:text-base font-semibold mb-4 text-gray-100">รายชื่อคณะผู้จัดทำ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-3 hover:bg-white/15 transition-colors border border-white/10 shadow-lg"
                >
                  <div className="text-blue-300 font-mono text-xs mb-1 font-semibold">{member.id}</div>
                  <div className="text-white font-medium text-xs md:text-sm">{member.name}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Progress Bar - Compact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mb-6"
        >
          <div className="max-w-sm mx-auto">
            <div className="flex justify-between text-xs text-gray-200 mb-2 font-medium">
              <span>กำลังโหลด...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden border border-white/20">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Enter Button (appears when progress is complete) */}
        {progress >= 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-16 relative z-50"
          >
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px -12px rgba(59, 130, 246, 0.5)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className="relative px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 border-2 border-white/20 backdrop-blur-sm group overflow-hidden"
            >

              
              {/* Button text */}
              <span className="relative z-10 flex items-center gap-2">
                <span>เข้าสู่ระบบ</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.div>
              </span>
            </motion.button>
          </motion.div>
        )}
        </div>

        {/* Copyright - Fixed at bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center z-10 pb-4"
        >
          <p className="text-xs text-gray-300 font-medium">
            © 2024 Suranaree University of Technology
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Industrial Electrical Engineering
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen; 