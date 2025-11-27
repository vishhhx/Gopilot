import { motion } from "framer-motion";
import {
  FiMail,
  FiCalendar,
  FiFolder,
  FiZap,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";

function BenefitsSection() {
  const benefits = [
    {
      icon: <FiMail className="w-8 h-8" />,
      title: "Smart Email Management",
      description:
        "Let AI prioritize, categorize, and draft responses to your emails. Never miss what matters while spending 60% less time in your inbox.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: <FiFolder className="w-8 h-8" />,
      title: "Intelligent Document Search",
      description:
        "Find any file in seconds with natural language queries. GoPilot understands context and surfaces exactly what you need from Drive.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: <FiCalendar className="w-8 h-8" />,
      title: "Effortless Scheduling",
      description:
        "Schedule meetings, find optimal times, and manage your calendar with simple commands. Coordinate across time zones without the headache.",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: <FiZap className="w-8 h-8" />,
      title: "Automated Workflows",
      description:
        "Create custom automation for repetitive tasks. From email follow-ups to document organization, let AI handle the busywork.",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: <FiClock className="w-8 h-8" />,
      title: "Save 10+ Hours Weekly",
      description:
        "Our users report saving an average of 10 hours per week on administrative tasks. Reinvest that time in what truly moves the needle.",
      gradient: "from-indigo-500 to-blue-500",
    },
    {
      icon: <FiTrendingUp className="w-8 h-8" />,
      title: "Continuous Learning",
      description:
        "GoPilot learns your preferences and work patterns over time, becoming more personalized and effective with every interaction.",
      gradient: "from-pink-500 to-rose-500",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="py-24 px-4 dark:bg-neutral-950 bg-neutral-50 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:text-blue-400 text-blue-600 border border-blue-500/20 mb-4">
              Why Choose GoPilot
            </span>
          </motion.div>

          <h2 className="text-5xl font-bold dark:text-neutral-100 text-neutral-900 mb-4">
            Work Smarter, Not Harder
          </h2>
          <p className="text-xl dark:text-neutral-400 text-neutral-600 max-w-2xl mx-auto">
            Unlock the full potential of your Google Workspace with AI that
            adapts to you
          </p>
        </motion.div>

        {/* Benefits grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative"
            >
              <div className="h-full p-8 rounded-2xl dark:bg-neutral-900/50 bg-white backdrop-blur-sm border dark:border-neutral-800 border-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-300 shadow-lg hover:shadow-2xl">
                {/* Icon with gradient background */}
                <div
                  className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${benefit.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className="text-white">{benefit.icon}</div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold dark:text-neutral-100 text-neutral-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="dark:text-neutral-400 text-neutral-600 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Decorative gradient line */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${benefit.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`}
                ></div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="dark:text-neutral-400 text-neutral-600 mb-6 text-lg">
            Join thousands of professionals who've transformed their workflow
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            Experience GoPilot Today
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default BenefitsSection;
