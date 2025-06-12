import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [showTeam, setShowTeam] = useState(false);

  useEffect(() => {
    // Show team members after 2 seconds
    const teamTimer = setTimeout(() => {
      setShowTeam(true);
    }, 2000);
    
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Auto navigate after 7 seconds
    const autoNavigateTimer = setTimeout(() => {
      localStorage.setItem("splash-seen", "true");
      navigate("/");
    }, 7000);

    return () => {
      clearTimeout(teamTimer);
      clearTimeout(autoNavigateTimer);
      clearInterval(progressInterval);
    };
  }, [navigate]);

  const handleSkip = () => {
    localStorage.setItem("splash-seen", "true");
    navigate("/");
  };

  const teamMembers = [
    { id: "B6523404", name: "นาย พีรวัฒน์ ทองล้วน" },
    { id: "B6523442", name: "นาย ภัทรพงษ์ พิศเพ็ง" },
    { id: "B6523497", name: "นาย สุริวัชร์ แสนทวีสุข" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white flex flex-col items-center justify-center relative overflow-hidden font-inter">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-400/30 rounded-full blur-2xl animate-ping delay-500"></div>
      </div>

      {/* Skip button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={handleSkip}
        className="absolute top-8 right-8 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm hover:bg-white/20 transition-colors z-10 border border-white/20"
      >
        ข้าม
      </motion.button>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        {/* University Info */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <div className="mb-4">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
                IEE
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-200 font-medium">วิศวกรรมไฟฟ้าอุตสาหกรรม</div>
                <div className="text-xs text-gray-300">INDUSTRIAL ELECTRICAL ENGINEERING</div>
              </div>
            </div>
          </div>
          <p className="text-lg text-gray-200 font-medium">สำนักวิชาวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีสุรนารี</p>
          
          {/* Project Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-xl px-4 py-2 border border-orange-400/30">
              <span className="text-sm text-gray-300">รหัสโปรเจค:</span>
              <span className="text-lg font-bold text-orange-300 tracking-wider">B65IEE02</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Project Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-2xl">
            Stand-Alone
          </h1>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent drop-shadow-2xl">
            Automatic
          </h1>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl">
            Fish Feeder
          </h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent flex-1 max-w-32"></div>
            <span className="text-lg md:text-xl text-gray-200 px-4 font-medium">using Internet of Things</span>
            <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent flex-1 max-w-32"></div>
          </motion.div>
        </motion.div>

        {/* Fish Animation */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mb-8"
        >
          <div className="text-4xl md:text-6xl animate-bounce">🐟</div>
        </motion.div>

        {/* Team Members */}
        {showTeam && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h2 className="text-xl md:text-2xl font-semibold mb-6 text-gray-100">รายชื่อคณะผู้จัดทำ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.2 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-4 hover:bg-white/15 transition-colors border border-white/10 shadow-lg"
                >
                  <div className="text-blue-300 font-mono text-sm mb-2 font-semibold">{member.id}</div>
                  <div className="text-white font-medium text-sm md:text-base">{member.name}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mb-8"
        >
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-200 mb-2 font-medium">
              <span>กำลังโหลด...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden border border-white/20">
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
            transition={{ duration: 0.5 }}
            className="mb-20 relative z-50"
          >
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.5)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className="relative px-12 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 border-2 border-white/20 backdrop-blur-sm group overflow-hidden"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Button text */}
              <span className="relative z-10 flex items-center gap-3">
                <span>เข้าสู่ระบบ</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.div>
              </span>
              
              {/* Shine effect */}
              <div className="absolute inset-0 -top-2 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:animate-pulse"></div>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Copyright - Fixed at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 text-center z-10"
      >
        <p className="text-xs md:text-sm text-gray-300 font-medium">
          © 2024 Suranaree University of Technology
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Industrial Electrical Engineering Department
        </p>
      </motion.div>
    </div>
  );
};

export default SplashScreen; 