import React, { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { 
  ShoppingBag, Plus, Minus, Search, Trash2, X, CheckCircle, 
  CreditCard, ShieldCheck, ArrowRight, Loader2, AlertCircle,
  User, LogOut, Dumbbell, Zap, Award, ChevronRight,
  Sun, Moon, ArrowLeft, Layers, Sparkles, Package, Star,
  Truck, RotateCcw, Image as ImageIcon, MessageSquare, Send
} from "lucide-react";

// 🔑 Import the new AuthModal component
import AuthModal from "./AuthModal";

// --- GLOBAL CONSTANTS ---
const NEON_LIME = "#D2FF00";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const GOOGLE_CLIENT_ID = "274945231229-r93q5jcgrmn7mtkrrvio87diuhnlfp8d.apps.googleusercontent.com";

// 🏷️ CATEGORIES CONFIGURATION
const CATEGORIES_DATA = [
  {
    id: "cat-weights",
    title: "Weights & Strength Equipment",
    description: "Heavy-duty dumbbells, Olympic barbells, and precision weight plates built for intense muscle building.",
    icon: Dumbbell,
    badgeColorDark: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    badgeColorLight: "border-amber-600/40 text-amber-800 bg-amber-100",
    image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",
    subcategories: ["Dumbbells", "Barbells", "Weight Plates"]
  },
  {
    id: "cat-accessories",
    title: "Gym Accessories",
    description: "Premium resistance bands, durable gear bags, and leak-proof shaker bottles for daily workout convenience.",
    icon: ShoppingBag,
    badgeColorDark: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    badgeColorLight: "border-cyan-600/40 text-cyan-800 bg-cyan-100",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800",
    subcategories: ["Resistance Bands", "Gym Bags", "Shaker Bottles"]
  },
  {
    id: "cat-services",
    title: "Gym Services",
    description: "Flexible VIP gym passes, 1-on-1 certified coaching sessions, and specialized fitness programs.",
    icon: Award,
    badgeColorDark: "border-lime-500/40 text-[#D2FF00] bg-lime-500/10",
    badgeColorLight: "border-lime-600/40 text-lime-800 bg-lime-100",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
    subcategories: ["Gym Pass", "Personal Trainers/Coaches", "Specialty Programs/Workshops"]
  }
];

const CUSTOMER_PICS = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/65.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/71.jpg",
  "https://randomuser.me/api/portraits/women/75.jpg",
];

// Helper to safely parse JSON strings from Database
const parseSafeJSON = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

// 🎬 INTRO LOADER COMPONENT
function IntroLoader({ onFinished, isDarkMode }) {
  const companyName = "AllTime FITNESS";
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-4 transition-colors ${
      isDarkMode ? "bg-[#09090B]" : "bg-zinc-950"
    }`}>
      <div className="animate-pop-in mb-6">
        <Dumbbell className="w-12 h-12 md:w-16 md:h-16 text-[#D2FF00] drop-shadow-[0_0_20px_#D2FF00]" />
      </div>

      <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wider uppercase text-[#D2FF00] relative flex flex-wrap justify-center gap-1 sm:gap-2">
        {companyName.split("").map((letter, index) => (
          <span
            key={index}
            className="inline-block animate-letter glow-text"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            {letter === " " ? "\u00A0" : letter}
          </span>
        ))}
      </h1>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D2FF0015_0%,_transparent_70%)] pointer-events-none" />
    </div>
  );
}

// 🏋️ MAIN GYM CUSTOMER APP
function GymCustomerApp() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSiteLoading, setIsSiteLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home"); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [detailPageQty, setDetailPageQty] = useState(1);
  const [activeInfoTab, setActiveInfoTab] = useState("description"); 

  useEffect(() => {
    const savedUser = localStorage.getItem("gym_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setCheckoutData((prev) => ({
          ...prev,
          fullName: parsed.name || "",
          email: parsed.email || ""
        }));
      } catch (err) {
        localStorage.removeItem("gym_user");
      }
    }
  }, []);

  const [reviews, setReviews] = useState({
    1: [
      { id: 101, name: "Mark V.", rating: 5, date: "July 24, 2026", comment: "Solid dumbbells! Heavy-duty construction and the knurled rubber grip is top tier." },
      { id: 102, name: "Sarah T.", rating: 4, date: "July 20, 2026", comment: "Very durable. Delivered fast within Metro Manila. Good quality rubber." }
    ]
  });

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cart, setCart] = useState([]);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [checkoutData, setCheckoutData] = useState({
    fullName: "",
    email: "",
    address: "",
    paymentMethod: "GCash"
  });

  useEffect(() => {
    if (activeTab === "home") {
      setIsDarkMode(true);
    }
  }, [activeTab]);

  // Helper to normalize and ensure all database fields are present
  const normalizeProductData = (p) => {
    let parsedImages = parseSafeJSON(p.images, null);
    if (!parsedImages || !Array.isArray(parsedImages) || parsedImages.length === 0) {
      parsedImages = p.image_url ? [p.image_url] : [];
    }

    let parsedSpecs = parseSafeJSON(p.specs, null);
    if (!Array.isArray(parsedSpecs)) {
      if (typeof p.specs === "string" && p.specs.trim() !== "") {
        parsedSpecs = [{ label: "Specification", value: p.specs }];
      } else {
        parsedSpecs = [
          { label: "Category", value: p.category || "General Gear" },
          { label: "Subcategory", value: p.subcategory || "N/A" }
        ];
      }
    }

    return {
      ...p,
      image_url: p.image_url || (parsedImages.length > 0 ? parsedImages[0] : ""),
      images: parsedImages,
      full_description: p.full_description || p.description || "No full description available for this item.",
      description: p.description || p.full_description || "High performance gym equipment.",
      specs: parsedSpecs,
      warranty: p.warranty || "Standard 1-Year AllTime Fitness Factory Warranty",
      shipping_info: p.shipping_info || "Ships within 24-48 business hours with door-to-door delivery."
    };
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("Server error.");
      const data = await response.json();
      
      // Normalize raw DB product rows to ensure no missing fields
      const normalizedProducts = data.map(normalizeProductData);
      setProducts(normalizedProducts);
    } catch (err) {
      setApiError("Backend Offline or CORS blocked. Showing catalog preview.");
      setProducts([
        normalizeProductData({ 
          product_id: 1, 
          name: "Rubber Hex Dumbbell Pair 15kg", 
          price: 3200, 
          category: "Weights & Strength Equipment", 
          subcategory: "Dumbbells", 
          stock: 14,
          image_url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",
          images: [
            "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800"
          ],
          description: "Engineered with anti-roll hexagonal rubber heads and ergonomic chrome knurled handles.",
          full_description: "The Rubber Hex Dumbbell Pair 15kg delivers structural durability and superior grip comfort during heavy compound lifts.",
          specs: [
            { label: "Material", value: "Heavy-Duty Cast Iron Core" }
          ],
          warranty: "2 Years Commercial Warranty",
          shipping_info: "Ships within 24-48 hours."
        })
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handler for successful login/auth from AuthModal
  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem("gym_user", JSON.stringify(userData));
    if (token) localStorage.setItem("gym_token", token);
    setCheckoutData((prev) => ({
      ...prev,
      fullName: userData.name || "",
      email: userData.email || ""
    }));
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("gym_user");
    localStorage.removeItem("gym_token");
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newComment.trim()) return;

    const reviewObj = {
      id: Date.now(),
      name: user.name,
      rating: Number(newRating),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      comment: newComment.trim()
    };

    setReviews((prev) => ({
      ...prev,
      [selectedProduct.product_id]: [
        reviewObj,
        ...(prev[selectedProduct.product_id] || [])
      ]
    }));

    setNewComment("");
    setNewRating(5);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setPlacedOrder({
        order_id: `GYM-${Math.floor(100000 + Math.random() * 900000)}`,
        total_amount: cartSubtotal + 100,
        status: "Pending"
      });
      setIsSubmitting(false);
      setCart([]);
      setActiveTab("success");
    }, 800);
  };

  const addToCart = (product, quantityToAdd = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.product_id);
      if (existing) {
        return prev.map((item) => item.product_id === product.product_id ? { ...item, qty: item.qty + quantityToAdd } : item);
      }
      return [...prev, { ...product, qty: quantityToAdd }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => item.product_id !== id));
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? p.category === selectedCategory.title : true;
    const matchesSubcategory = selectedSubcategory === "All" ? true : p.subcategory === selectedSubcategory;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const openProductDetailPage = (product) => {
    const normalized = normalizeProductData(product);
    setSelectedProduct(normalized);
    setSelectedImageIndex(0);
    setDetailPageQty(1);
    setActiveInfoTab("description");
    setActiveTab("product-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentProductReviews = selectedProduct ? (reviews[selectedProduct.product_id] || []) : [];
  const averageRating = currentProductReviews.length > 0 
    ? (currentProductReviews.reduce((sum, r) => sum + r.rating, 0) / currentProductReviews.length).toFixed(1)
    : "5.0";

  const renderWhyChooseUs = () => (
    <section className="py-20 px-6">
        <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold uppercase text-white mb-2">Why Choose Us</h2>
            <p className="text-zinc-400 max-w-lg mx-auto text-sm">We provide world-class facilities, expert guidance, and a supportive community to help you achieve your goals.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
                {[
                    {title: "World-Class Equipment", desc: "Top-tier machines and free weights from leading brands."},
                    {title: "Certified Expert Trainers", desc: "Our coaches are here to create personalized plans for you."},
                    {title: "Flexible Membership", desc: "Various plans tailored to your specific fitness journey."},
                    {title: "24/7 Access Available", desc: "Train on your schedule, anytime, any day."},
                ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-[#D2FF00]/20 shrink-0">
                            <Zap className="w-6 h-6 text-[#D2FF00]" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-lg">{item.title}</h4>
                            <p className="text-zinc-400 text-sm">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600" alt="Gym" className="rounded-2xl h-full object-cover"/>
                <div className="grid grid-rows-2 gap-4">
                    <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600" alt="Gym" className="rounded-2xl h-full object-cover"/>
                    <img src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600" alt="Gym" className="rounded-2xl h-full object-cover"/>
                </div>
            </div>
        </div>
    </section>
  );

  const renderCoaches = () => (
    <section className="py-20 px-6 bg-zinc-950 rounded-3xl my-16">
        <div className="grid md:grid-cols-3 gap-12 items-center">
            <div className="grid grid-cols-2 gap-4">
                {CUSTOMER_PICS.map((pic, i) => (
                    <img key={i} src={pic} alt="Customer" className="rounded-full w-24 h-24 border-4 border-zinc-800 object-cover mx-auto" />
                ))}
            </div>
            <div className="md:col-span-2 space-y-6">
                <div className="uppercase text-sm font-bold text-[#D2FF00] tracking-widest">Are you looking for a mentor?</div>
                <h2 className="text-5xl font-black text-white uppercase leading-tight">Coaches</h2>
                <p className="text-zinc-300 text-base leading-relaxed">Our certified personal trainers are ready to help you unlock your potential. Whether you're a beginner or an elite athlete, find the right mentor to guide your journey.</p>
                <button 
                  style={{ backgroundColor: NEON_LIME }} 
                  className="text-black font-extrabold px-8 py-3 rounded-xl uppercase tracking-wider text-sm hover:scale-105 transition-transform" 
                  onClick={() => { setActiveTab("shop"); setSelectedCategory(CATEGORIES_DATA[2]); }}
                >
                  Find a Coach
                </button>
            </div>
        </div>
    </section>
  );

  const renderPricing = () => (
    <section className="py-20 px-6">
        <div className="text-center mb-16 flex flex-col items-center">
            <div className="flex gap-2 p-1 bg-zinc-800 rounded-full mb-8 text-xs font-bold uppercase tracking-wider">
                <button style={{ backgroundColor: NEON_LIME }} className="px-6 py-2 rounded-full text-black">Regular</button>
                <button className="px-6 py-2 rounded-full text-zinc-400">Monthly</button>
            </div>
            <h2 className="text-4xl font-extrabold uppercase text-white mb-2">Join Today</h2>
            <p className="text-zinc-400 max-w-lg mx-auto text-sm">Flexible plans designed for every fitness level.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-end">
            {[
                {name: "Beginner Pass", price: "₱1,000", features: ["Access to Gym Floor", "Locker Room access", "1 Fitness Assessment"], popular: false},
                {name: "Premium Pass", price: "₱1,500", features: ["All Beginner features", "Unlimited Group Classes", "Sauna & Steam Access"], popular: true},
                {name: "Pro Pass", price: "₱2,000", features: ["All Premium features", "2 Personal Training Sessions/mo", "Priority Support"], popular: false},
            ].map(plan => (
                <div key={plan.name} className={`p-8 rounded-2xl border border-[#D2FF00]/20 space-y-6 ${plan.popular ? "bg-[#D2FF00] text-black scale-105" : "bg-zinc-950 text-white"}`}>
                    <div className="flex justify-between items-center">
                        <div className={`uppercase text-xs font-bold tracking-widest ${plan.popular ? "text-black/70" : "text-[#D2FF00]"}`}>{plan.name}</div>
                        {plan.popular && <span className="bg-black text-[#D2FF00] text-[10px] font-bold px-3 py-1 rounded-full uppercase">Most Popular</span>}
                    </div>
                    <div className="flex items-baseline gap-1">
                        <div className="text-5xl font-black">{plan.price}</div>
                        <div className={`text-sm ${plan.popular ? "text-black/70" : "text-zinc-400"}`}>/ Month</div>
                    </div>
                    <ul className={`text-sm space-y-3 pt-4 border-t ${plan.popular ? "border-black/20" : "border-zinc-800"}`}>
                        {plan.features.map(f => (
                            <li key={f} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" /> {f}</li>
                        ))}
                    </ul>
                    <button 
                      className={`w-full py-3.5 rounded-xl font-bold uppercase text-sm tracking-wider ${plan.popular ? "bg-black text-[#D2FF00]" : "bg-[#D2FF00] text-black"}`} 
                      onClick={() => { setActiveTab("shop"); setSelectedCategory(CATEGORIES_DATA[2]); }}
                    >
                      Choose Plan
                    </button>
                </div>
            ))}
        </div>
    </section>
  );

  const renderFooter = () => (
    <footer className="bg-zinc-950 pt-20 pb-10 px-6 mt-16 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-sm text-zinc-400">
            <div className="space-y-4">
                <div style={{ backgroundColor: NEON_LIME }} className="text-black font-black text-lg px-2.5 py-1 rounded-lg flex items-center gap-1 inline-flex">
                  <Dumbbell className="w-5 h-5 fill-black" /> AllTime Fitness
                </div>
                <p className="text-xs">Your journey to peak fitness starts here. Access elite facilities, premium gear, and expert coaching.</p>
            </div>
            {[
                {title: "Quick Links", links: ["Home", "About Us", "Contact"]},
                {title: "Programs", links: ["Bodybuilding", "Yoga", "Weight Loss", "Cardio"]},
                {title: "Services", links: ["Personal Training"]},
            ].map(col => (
                <div key={col.title} className="space-y-3">
                    <h5 className="font-bold text-white text-base uppercase tracking-wider mb-4">{col.title}</h5>
                    {col.links.map(link => <a key={link} href="#" className="block hover:text-[#D2FF00] transition-colors">{link}</a>)}
                </div>
            ))}
        </div>
        <div className="max-w-7xl mx-auto text-center text-xs text-zinc-600 mt-16 pt-8 border-t border-zinc-800">
            &copy; {new Date().getFullYear()} AllTime Fitness. All rights reserved.
        </div>
    </footer>
  );

  return (
    <>
      <style>{`
        @keyframes letterIn {
          0% { opacity: 0; transform: translateY(30px) scale(0.6); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes subtleZoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .animate-letter {
          opacity: 0;
          animation: letterIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-up {
          opacity: 0;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-pop-in {
          opacity: 0;
          animation: popIn 0.4s ease-out forwards;
        }
        .glow-text {
          text-shadow: 0 0 15px rgba(210, 255, 0, 0.7);
        }
        .animate-zoom-bg {
          animation: subtleZoom 20s infinite ease-in-out;
        }
        .touch-action-none {
          touch-action: manipulation;
        }
      `}</style>

      {/* INTRO LOADER SCREEN */}
      {isSiteLoading && <IntroLoader onFinished={() => setIsSiteLoading(false)} isDarkMode={isDarkMode} />}

      {/* MAIN APP WRAPPER */}
      <div className={`min-h-screen flex flex-col font-sans antialiased selection:bg-[#D2FF00] selection:text-black transition-colors duration-500 ${
        isDarkMode ? "bg-[#09090B] text-zinc-100" : "bg-zinc-50 text-zinc-900"
      } ${isSiteLoading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
        
        {/* NAVBAR */}
        <nav className={`sticky top-0 z-40 backdrop-blur-md border-b px-3 sm:px-6 md:px-8 py-3 flex items-center justify-between transition-colors duration-300 ${
          isDarkMode ? "bg-[#09090B]/90 border-zinc-800" : "bg-white/90 border-zinc-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group" onClick={() => {
            setActiveTab("home");
            setSelectedCategory(null);
            setSelectedSubcategory("All");
          }}>
            <div style={{ backgroundColor: NEON_LIME }} className="text-black font-black text-sm sm:text-lg px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 transition-transform group-hover:scale-105">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 fill-black" /> AllTime Fitness
            </div>
            {activeTab === "home" && <span className="font-extrabold text-xs sm:text-base tracking-wider hidden xs:inline-block text-white">FITNESS</span>}
          </div>

          {activeTab === "home" ? (
             <div className="flex items-center gap-6 text-sm font-medium text-white/70">
                {["Home", "Shop Now"].map(item => (
                    <a key={item} href="#" onClick={(e) => { e.preventDefault(); setActiveTab("shop"); }} className="hover:text-white transition-colors">{item}</a>
                ))}
             </div>
          ) : (
            <div className={`flex items-center gap-1 p-1 rounded-xl border transition-colors ${
              isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"
            }`}>
              {["shop", "checkout"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'checkout' && cart.length === 0) {
                        setIsCartOpen(true);
                        return;
                    }
                    setActiveTab(tab);
                    if (tab === "shop") {
                      setSelectedCategory(null);
                      setSelectedSubcategory("All");
                    }
                  }}
                  style={activeTab === tab || (activeTab === "product-detail" && tab === "shop") ? { backgroundColor: NEON_LIME } : {}}
                  className={`relative px-2.5 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all duration-300 ${
                    activeTab === tab || (activeTab === "product-detail" && tab === "shop")
                      ? "text-black shadow-[0_0_10px_#D2FF0040]" 
                      : isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-black"
                  }`}
                >
                  <span className="uppercase tracking-wider">{tab === "shop" ? "Catalog" : "Checkout"}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-3">
            {activeTab !== "home" && (
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className={`p-2 rounded-xl border transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isDarkMode 
                    ? "bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800" 
                    : "bg-white border-zinc-200 text-indigo-600 hover:bg-zinc-100 shadow-sm"
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {user ? (
              <div className={`flex items-center gap-1.5 sm:gap-2 border px-2.5 py-1.5 rounded-xl text-xs ${
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
              }`}>
                {user.picture ? (
                  <img src={user.picture} alt="Avatar" className="w-4 h-4 rounded-full" />
                ) : (
                  <User className={`w-3.5 h-3.5 ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`} />
                )}
                <span className="hidden md:inline font-medium">{user.name}</span>
                <button onClick={handleLogout} title="Logout" className="text-zinc-500 hover:text-red-400 ml-1">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={`text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                  isDarkMode 
                    ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white" 
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-900 text-white shadow-sm"
                }`}
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative border p-2 sm:p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                isDarkMode 
                  ? "bg-zinc-900 border-zinc-800 hover:border-[#D2FF00]/50" 
                  : "bg-white border-zinc-200 shadow-sm hover:border-zinc-400"
              }`}
            >
              <ShoppingBag className={`w-4 h-4 ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`} />
              {cart.length > 0 && (
                <span style={{ backgroundColor: NEON_LIME }} className="absolute -top-1.5 -right-1.5 text-black font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pop-in">
                  {cart.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </nav>

        {apiError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-500 text-xs flex items-center justify-center gap-2 font-medium text-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* LANDING PAGE */}
        {activeTab === "home" && (
          <main className="flex-1 flex flex-col bg-[#09090B]">
            <section className="relative flex-1 flex flex-col py-12 px-6 md:px-8 overflow-hidden min-h-[calc(100vh-70px)]">
              <video 
                autoPlay loop muted playsInline 
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none animate-zoom-bg opacity-30 brightness-75 contrast-110"
              >
                <source src="/gym-promo.mp4" type="video/mp4" />
              </video>

              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[#09090B]/30 via-[#09090B]/80 to-[#09090B]" />

              <div className="relative z-20 max-w-7xl mx-auto w-full pt-16 flex-1 flex flex-col justify-center animate-slide-up" style={{ animationDelay: "200ms" }}>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase leading-[0.95] text-white max-w-2xl">
                  Elevate your <span className="text-[#D2FF00] glow-text">workout</span>
                </h1>

                <p className="max-w-md text-sm sm:text-base leading-relaxed text-zinc-300 px-1 mt-6">
                  Access elite gym facilities, premium equipment, gear, and personal trainers—all in one place. Your journey to peak performance starts here.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pt-8">
                  <button
                    onClick={() => setActiveTab("shop")}
                    style={{ backgroundColor: NEON_LIME }}
                    className="w-full sm:w-auto text-black font-extrabold px-10 py-4 rounded-xl uppercase tracking-wider text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-md"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </section>

            {renderWhyChooseUs()}
            {renderCoaches()}
            {renderPricing()}
            {renderFooter()}
          </main>
        )}

        {/* CATALOG / SHOP PAGE */}
        {activeTab === "shop" && (
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 sm:py-10 animate-slide-up">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <div className="flex items-center gap-2">
                  {selectedCategory && (
                    <button 
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedSubcategory("All");
                      }} 
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all mr-1 ${
                        isDarkMode 
                          ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-[#D2FF00] hover:border-[#D2FF00]/50" 
                          : "bg-white border-zinc-300 text-zinc-800 hover:text-black shadow-sm"
                      }`}
                      title="Return to Categories"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">All Categories</span>
                    </button>
                  )}
                  <h1 className={`text-xl sm:text-2xl font-black tracking-tight uppercase ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {selectedCategory ? selectedCategory.title : "Catalog & Services"}
                  </h1>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  {selectedCategory 
                    ? `Showing ${selectedSubcategory === "All" ? "all subcategories" : selectedSubcategory} items`
                    : "Select a category below to explore equipment, gear, or gym services."}
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search item or pass..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl pl-10 pr-4 py-2.5 sm:py-2 text-xs transition-all focus:outline-none ${
                    isDarkMode 
                      ? "bg-zinc-900 border-zinc-800 text-white focus:border-[#D2FF00]" 
                      : "bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500 shadow-sm"
                  }`}
                />
              </div>
            </div>

            {!selectedCategory && searchQuery.trim() === "" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 my-4 sm:my-6">
                {CATEGORIES_DATA.map((cat, idx) => {
                  const IconComp = cat.icon;
                  return (
                    <div 
                      key={cat.id} 
                      className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                        isDarkMode 
                          ? "bg-zinc-900/90 border-zinc-800 hover:border-[#D2FF00]/50" 
                          : "bg-white border-zinc-200 shadow-lg hover:border-zinc-400"
                      }`}
                    >
                      <div className="h-40 sm:h-48 relative overflow-hidden">
                        <img 
                          src={cat.image} 
                          alt={cat.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-75 group-hover:brightness-90"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${isDarkMode ? "from-[#09090B] via-[#09090B]/50" : "from-white via-white/40"} to-transparent`} />
                        
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md ${
                            isDarkMode ? cat.badgeColorDark : cat.badgeColorLight
                          }`}>
                            <IconComp className="w-3.5 h-3.5" /> Category 0{idx + 1}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6 pt-2 flex-1 flex flex-col justify-between space-y-4 sm:space-y-6">
                        <div>
                          <h2 className={`text-lg sm:text-xl font-black uppercase tracking-tight mb-1.5 transition-colors ${
                            isDarkMode ? "text-white group-hover:text-[#D2FF00]" : "text-zinc-900 group-hover:text-lime-700"
                          }`}>
                            {cat.title}
                          </h2>
                          <p className={`text-xs leading-relaxed ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                            {cat.description}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                            Included Subcategories:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.subcategories.map((sub, i) => (
                              <button
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategory(cat);
                                  setSelectedSubcategory(sub);
                                }}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                                  isDarkMode 
                                    ? "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-[#D2FF00] hover:text-[#D2FF00]" 
                                    : "bg-zinc-100 border-zinc-300 text-zinc-700 hover:border-lime-700 hover:text-lime-800"
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedCategory(cat);
                            setSelectedSubcategory("All");
                          }}
                          style={{ backgroundColor: NEON_LIME }}
                          className="w-full text-black font-extrabold text-xs py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 shadow-md"
                        >
                          Explore {cat.title.split(" ")[0]} <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* PRODUCT GRID */
              <div>
                {selectedCategory && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 sm:mb-6 border-b border-zinc-800 scrollbar-none">
                    <span className="text-xs font-bold text-zinc-500 uppercase mr-1 shrink-0 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> Filter:
                    </span>
                    <button
                      onClick={() => setSelectedSubcategory("All")}
                      style={selectedSubcategory === "All" ? { backgroundColor: NEON_LIME } : {}}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedSubcategory === "All"
                          ? "text-black shadow-[0_0_10px_#D2FF0040]"
                          : isDarkMode ? "bg-zinc-900 border border-zinc-800 text-zinc-400" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      All ({selectedCategory.subcategories.length})
                    </button>
                    {selectedCategory.subcategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubcategory(sub)}
                        style={selectedSubcategory === sub ? { backgroundColor: NEON_LIME } : {}}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          selectedSubcategory === sub
                            ? "text-black shadow-[0_0_10px_#D2FF0040]"
                            : isDarkMode ? "bg-zinc-900 border border-zinc-800 text-zinc-400" : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim() !== "" && (
                  <div className="mb-4 text-xs text-zinc-400">
                    Showing search results for: <span className={isDarkMode ? "text-[#D2FF00] font-bold" : "text-lime-700 font-bold"}>"{searchQuery}"</span>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D2FF00] mb-2" />
                    <p className="text-xs">Loading Catalog Items...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-16 border rounded-3xl border-dashed border-zinc-800 p-6">
                    <Sparkles className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <h3 className="font-bold text-sm">No products found</h3>
                    <p className="text-xs text-zinc-500 mt-1">Try selecting another subcategory or clear your search bar.</p>
                    <button 
                      onClick={() => {
                        setSelectedSubcategory("All");
                        setSearchQuery("");
                      }}
                      className={`mt-4 text-xs underline font-bold ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`}
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredProducts.map((p, index) => (
                      <div 
                        key={p.product_id} 
                        onClick={() => openProductDetailPage(p)}
                        className={`border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between group cursor-pointer animate-pop-in ${
                          isDarkMode 
                            ? "bg-zinc-900/80 border-zinc-800 hover:border-[#D2FF00]/50" 
                            : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300"
                        }`} 
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div>
                          <div className={`h-44 sm:h-48 overflow-hidden relative ${isDarkMode ? "bg-zinc-950" : "bg-zinc-100"}`}>
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
                            <span className={`absolute top-3 left-3 backdrop-blur border text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${
                              isDarkMode 
                                ? "bg-zinc-900/90 border-zinc-700 text-zinc-300" 
                                : "bg-white/90 border-zinc-300 text-zinc-700 shadow-sm"
                            }`}>
                              {p.subcategory || p.category}
                            </span>

                            <span className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-[#D2FF00] border border-[#D2FF00]/30 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                              <Package className="w-3 h-3 text-[#D2FF00]" /> {p.stock} in stock
                            </span>
                          </div>

                          <div className="p-4">
                            <h3 className={`font-bold text-sm leading-snug transition-colors ${
                              isDarkMode ? "text-white group-hover:text-[#D2FF00]" : "text-zinc-900 group-hover:text-lime-700"
                            }`}>{p.name}</h3>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                            <p className={`text-lg sm:text-xl font-black mt-3 ${isDarkMode ? "text-[#D2FF00]" : "text-zinc-900"}`}>
                              ₱{Number(p.price).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openProductDetailPage(p);
                            }}
                            className={`flex-1 font-bold text-xs py-2.5 rounded-xl border transition-all ${
                              isDarkMode 
                                ? "border-zinc-700 text-zinc-300 hover:text-[#D2FF00]" 
                                : "border-zinc-300 text-zinc-700 hover:text-black"
                            }`}
                          >
                            Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p, 1);
                            }}
                            style={{ backgroundColor: NEON_LIME }}
                            className="text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                            title="Add to Cart"
                          >
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        )}

        {/* PRODUCT DETAILS PAGE */}
        {activeTab === "product-detail" && selectedProduct && (
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 sm:py-8 animate-slide-up">
            
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab("shop")}
                className={`inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
                  isDarkMode 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-[#D2FF00] hover:border-[#D2FF00]/50" 
                    : "bg-white border-zinc-200 text-zinc-700 hover:text-black shadow-sm"
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Return to Catalog
              </button>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-500 font-medium overflow-x-auto">
                <span>Shop</span> <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-none">{selectedProduct.category}</span> <ChevronRight className="w-3 h-3 shrink-0" />
                <span className={`truncate max-w-[120px] sm:max-w-none ${isDarkMode ? "text-zinc-200" : "text-zinc-800"}`}>{selectedProduct.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
              <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                <div className={`relative rounded-3xl overflow-hidden border aspect-[4/3] flex items-center justify-center ${
                  isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200 shadow-inner"
                }`}>
                  <img 
                    src={selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images[selectedImageIndex] : selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                  <span className="absolute top-3 left-3 backdrop-blur bg-black/70 border border-zinc-700 text-zinc-200 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedProduct.subcategory || selectedProduct.category}
                  </span>
                </div>

                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Photos:
                    </span>
                    {selectedProduct.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          selectedImageIndex === idx 
                            ? "border-[#D2FF00] scale-105" 
                            : "border-transparent opacity-60"
                        }`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
                      isDarkMode 
                        ? "bg-[#D2FF00]/10 text-[#D2FF00] border-[#D2FF00]/30" 
                        : "bg-lime-500/10 text-lime-800 border-lime-600/30"
                    }`}>
                      <Package className="w-3.5 h-3.5" /> {selectedProduct.stock} Units Available
                    </span>
                    
                    <button 
                      onClick={() => setActiveInfoTab("reviews")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 hover:underline"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {averageRating} ({currentProductReviews.length} Reviews)
                    </button>
                  </div>

                  <h1 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {selectedProduct.name}
                  </h1>

                  <div className="flex items-baseline gap-3">
                    <span className={`text-2xl sm:text-3xl font-black ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`}>
                      ₱{Number(selectedProduct.price).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500">VAT Included</span>
                  </div>

                  <p className={`text-xs leading-relaxed ${isDarkMode ? "text-zinc-300" : "text-zinc-600"}`}>
                    {selectedProduct.description}
                  </p>

                  <div className="border-t border-zinc-800 my-4" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-zinc-400">Select Quantity</span>
                      <div className={`flex items-center border rounded-xl p-1 ${isDarkMode ? "border-zinc-700 bg-zinc-950" : "border-zinc-300 bg-zinc-100"}`}>
                        <button 
                          onClick={() => setDetailPageQty((q) => Math.max(1, q - 1))}
                          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 text-sm font-extrabold">{detailPageQty}</span>
                        <button 
                          onClick={() => setDetailPageQty((q) => Math.min(selectedProduct.stock, q + 1))}
                          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <button
                        onClick={() => addToCart(selectedProduct, detailPageQty)}
                        style={{ backgroundColor: NEON_LIME }}
                        className="w-full text-black font-black text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                      >
                        <ShoppingBag className="w-4 h-4" /> Add {detailPageQty} to Cart • ₱{(selectedProduct.price * detailPageQty).toLocaleString()}
                      </button>
                      
                      <button
                        onClick={() => {
                          addToCart(selectedProduct, detailPageQty);
                          setActiveTab("checkout");
                        }}
                        className={`w-full font-bold text-xs py-3 rounded-xl border transition-all active:scale-95 ${
                          isDarkMode ? "bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-white" : "bg-zinc-900 border-zinc-900 hover:bg-zinc-800 text-white"
                        }`}
                      >
                        Buy It Now
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-3 gap-2 p-3 sm:p-4 rounded-2xl border text-center ${
                  isDarkMode ? "bg-zinc-900/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="flex flex-col items-center gap-1">
                    <Truck className={`w-4 h-4 ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`} />
                    <span className="text-[10px] font-bold">Fast Delivery</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 border-x border-zinc-800">
                    <ShieldCheck className="w-4 h-4 text-cyan-500" />
                    <span className="text-[10px] font-bold">Authentic Gear</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <RotateCcw className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-bold">Easy Returns</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-12 sm:mt-16 border-t border-zinc-800 pt-8 sm:pt-10">
              <div className="flex items-center gap-3 sm:gap-4 border-b border-zinc-800 pb-3 overflow-x-auto scrollbar-none">
                {[
                  { id: "description", label: "Overview & Usage" },
                  { id: "specs", label: "Technical Specs" },
                  { id: "shipping", label: "Warranty & Shipping" },
                  { id: "reviews", label: `Reviews (${currentProductReviews.length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInfoTab(tab.id)}
                    className={`text-xs font-bold pb-2 transition-all relative uppercase tracking-wider whitespace-nowrap ${
                      activeInfoTab === tab.id 
                        ? isDarkMode ? "text-[#D2FF00]" : "text-lime-800"
                        : isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {tab.label}
                    {activeInfoTab === tab.id && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? "bg-[#D2FF00]" : "bg-lime-700"}`} />
                    )}
                  </button>
                ))}
              </div>

              {activeInfoTab === "description" && (
                <div className="py-6 max-w-4xl space-y-3 animate-slide-up">
                  <h3 className="text-base sm:text-lg font-bold">Product Overview</h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                    {selectedProduct.full_description || selectedProduct.description}
                  </p>
                </div>
              )}

              {activeInfoTab === "specs" && (
                <div className="py-6 max-w-3xl animate-slide-up">
                  <h3 className="text-base sm:text-lg font-bold mb-3">Specifications Matrix</h3>
                  {selectedProduct.specs && Array.isArray(selectedProduct.specs) && selectedProduct.specs.length > 0 ? (
                    <div className={`border rounded-2xl overflow-hidden ${isDarkMode ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200 bg-white"}`}>
                      {selectedProduct.specs.map((item, idx) => (
                        <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 text-xs border-b last:border-b-0 gap-1 ${
                          isDarkMode ? "border-zinc-800/80" : "border-zinc-200"
                        }`}>
                          <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px] sm:text-xs">{item.label || "Feature"}</span>
                          <span className={`font-bold ${isDarkMode ? "text-zinc-200" : "text-zinc-900"}`}>{item.value || item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">Standard commercial grade specifications apply.</p>
                  )}
                </div>
              )}

              {activeInfoTab === "shipping" && (
                <div className="py-6 max-w-3xl space-y-4 animate-slide-up">
                  <div className={`p-4 sm:p-5 rounded-2xl border ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
                    <h4 className="font-bold text-xs sm:text-sm text-amber-500 mb-1 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Warranty Policy
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1">
                      {selectedProduct.warranty || "Standard 1-Year AllTime Fitness Factory Warranty"}
                    </p>
                  </div>

                  <div className={`p-4 sm:p-5 rounded-2xl border ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
                    <h4 className="font-bold text-xs sm:text-sm text-[#D2FF00] mb-1 flex items-center gap-2">
                      <Truck className="w-4 h-4" /> Shipping & Delivery Info
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1">
                      {selectedProduct.shipping_info || "Ships within 24-48 business hours with door-to-door delivery."}
                    </p>
                  </div>
                </div>
              )}

              {activeInfoTab === "reviews" && (
                <div className="py-6 max-w-4xl space-y-6 animate-slide-up">
                  <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isDarkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className="text-center border-r border-zinc-800 pr-5">
                        <span className={`text-3xl sm:text-4xl font-black ${isDarkMode ? "text-white" : "text-zinc-900"}`}>{averageRating}</span>
                        <div className="flex items-center justify-center gap-0.5 my-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">{currentProductReviews.length} Ratings</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm">Customer Feedback & Reviews</h4>
                        <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">Verified buyers sharing real usage experience.</p>
                      </div>
                    </div>

                    {!user && (
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                          isDarkMode ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                        }`}
                      >
                        Sign In to Leave a Review
                      </button>
                    )}
                  </div>

                  {user ? (
                    <form onSubmit={handleAddReview} className={`p-4 sm:p-6 rounded-2xl border space-y-4 ${
                      isDarkMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
                    }`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                          <MessageSquare className={`w-4 h-4 ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`} /> Write a Review
                        </h4>
                        <span className="text-[11px] text-zinc-400">User: <strong className={isDarkMode ? "text-white" : "text-zinc-900"}>{user.name}</strong></span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Select Star Rating</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setNewRating(star)}
                              className="p-1.5 touch-action-none hover:scale-110 active:scale-95 transition-transform"
                            >
                              <Star className={`w-6 h-6 ${star <= newRating ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`} />
                            </button>
                          ))}
                          <span className="text-xs font-bold ml-2 text-amber-400">{newRating} / 5 Stars</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Your Review</label>
                        <textarea
                          rows="3"
                          required
                          placeholder="Share your thoughts about product quality and performance..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className={`w-full border rounded-xl p-3 text-xs focus:outline-none ${
                            isDarkMode 
                              ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" 
                              : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-lime-600"
                          }`}
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        style={{ backgroundColor: NEON_LIME }}
                        className="text-black font-extrabold text-xs px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                      >
                        Submit Review <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : null}

                  <div className="space-y-3 sm:space-y-4">
                    {currentProductReviews.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-6">No reviews yet for this product. Be the first to leave one!</p>
                    ) : (
                      currentProductReviews.map((rev) => (
                        <div key={rev.id} className={`p-4 sm:p-5 rounded-2xl border space-y-2 animate-pop-in ${
                          isDarkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#D2FF00]/20 text-[#D2FF00] border border-[#D2FF00]/40 flex items-center justify-center font-bold text-xs">
                                {rev.name.charAt(0)}
                              </div>
                              <div>
                                <h5 className="font-bold text-xs">{rev.name}</h5>
                                <div className="flex items-center gap-0.5">
                                  {[...Array(rev.rating)].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-medium">{rev.date}</span>
                          </div>
                          <p className={`text-xs leading-relaxed pt-1 ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                            "{rev.comment}"
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        {/* CHECKOUT PAGE */}
        {activeTab === "checkout" && (
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10 animate-slide-up">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => {
                  if (selectedProduct) {
                    setActiveTab("product-detail");
                  } else {
                    setActiveTab("shop");
                  }
                }}
                className={`inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
                  isDarkMode 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-[#D2FF00] hover:border-[#D2FF00]/50" 
                    : "bg-white border-zinc-200 text-zinc-700 hover:text-black shadow-sm"
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Return to Shopping
              </button>
            </div>

            <h2 className={`text-xl font-black uppercase mb-6 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Complete Checkout</h2>
            <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
              }`}>
                <h3 className={`font-bold text-sm mb-2 ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>Customer Information</h3>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Full Name</label>
                  <input
                    required
                    type="text"
                    value={checkoutData.fullName}
                    onChange={(e) => setCheckoutData({ ...checkoutData, fullName: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${
                      isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Email Address</label>
                  <input
                    required
                    type="email"
                    value={checkoutData.email}
                    onChange={(e) => setCheckoutData({ ...checkoutData, email: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${
                      isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Shipping / Billing Address</label>
                  <textarea
                    required
                    rows="3"
                    value={checkoutData.address}
                    onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${
                      isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                    }`}
                  ></textarea>
                </div>
              </div>

              <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between ${
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
              }`}>
                <div>
                  <h3 className={`font-bold text-sm mb-4 ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>Payment Option</h3>
                  <div className="space-y-3 mb-6">
                    {[
                      { value: "GCash", icon: CreditCard, color: "text-cyan-500", label: "GCash / E-Wallet" },
                      { value: "COD", icon: ShieldCheck, color: "text-amber-500", label: "Cash on Delivery" }
                    ].map(method => (
                      <label key={method.value} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        isDarkMode ? "bg-zinc-950 border-zinc-800 hover:border-[#D2FF00]/50" : "bg-zinc-50 border-zinc-200 hover:border-zinc-400"
                      }`}>
                        <input
                          type="radio"
                          name="payment"
                          value={method.value}
                          checked={checkoutData.paymentMethod === method.value}
                          onChange={(e) => setCheckoutData({ ...checkoutData, paymentMethod: e.target.value })}
                          className="w-4 h-4"
                        />
                        <method.icon className={`w-4 h-4 ${method.color}`} />
                        <span className={`font-medium text-xs ${isDarkMode ? "text-white" : "text-zinc-800"}`}>{method.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className={`border-t pt-4 space-y-2 text-xs ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                    <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>₱{cartSubtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Processing Fee</span><span>₱100</span></div>
                    <div className={`flex justify-between font-bold text-sm border-t pt-2 ${
                      isDarkMode ? "text-white border-zinc-800" : "text-zinc-900 border-zinc-200"
                    }`}>
                      <span>Total</span><span className={isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}>₱{(cartSubtotal + 100).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: NEON_LIME }}
                  className="w-full text-black font-extrabold text-xs py-3.5 rounded-xl transition-all mt-6 flex items-center justify-center gap-2 active:scale-95 shadow-md"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Place Order <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          </main>
        )}

        {/* SUCCESS PAGE */}
        {activeTab === "success" && placedOrder && (
          <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 text-center flex flex-col justify-center animate-pop-in">
            <div className={`p-8 rounded-2xl border ${
              isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <CheckCircle className="w-12 h-12 text-[#D2FF00] mx-auto mb-4 drop-shadow-[0_0_10px_#D2FF00]" />
              <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Order Confirmed!</h2>
              <p className="text-zinc-500 text-xs mt-1">
                Ref ID: <span className={`font-mono font-bold tracking-wider ${isDarkMode ? "text-[#D2FF00]" : "text-lime-800"}`}>{placedOrder.order_id}</span>
              </p>

              <button
                onClick={() => {
                  fetchProducts();
                  setActiveTab("shop");
                  setSelectedCategory(null);
                }}
                className={`w-full font-bold text-xs py-3 rounded-xl transition-all mt-6 active:scale-95 flex items-center justify-center gap-2 ${
                  isDarkMode ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Return to Catalog
              </button>
            </div>
          </main>
        )}

        {/* CART DRAWER */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-pop-in">
            <div className={`w-full sm:max-w-md h-full flex flex-col p-4 sm:p-6 shadow-2xl transition-colors ${
              isDarkMode ? "bg-[#09090B] border-l border-zinc-800 text-white" : "bg-white text-zinc-900"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className={`w-5 h-5 ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`} />
                  <h3 className="font-bold text-sm sm:text-base uppercase">Your Cart</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-none">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-semibold">Your cart is empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product_id} className={`p-3 rounded-xl border flex gap-3 items-center ${
                      isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                    }`}>
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs truncate">{item.name}</h4>
                        <p className={`text-xs font-black mt-0.5 ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`}>
                          ₱{Number(item.price).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={`flex items-center border rounded-lg ${isDarkMode ? "border-zinc-700 bg-zinc-950" : "border-zinc-300 bg-white"}`}>
                          <button onClick={() => updateQty(item.product_id, -1)} className="p-1.5 hover:text-[#D2FF00]">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1.5 text-xs font-bold">{item.qty}</span>
                          <button onClick={() => updateQty(item.product_id, 1)} className="p-1.5 hover:text-[#D2FF00]">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.product_id)} className="text-zinc-500 hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Subtotal:</span>
                    <span className={isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}>₱{cartSubtotal.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setActiveTab("checkout");
                    }}
                    style={{ backgroundColor: NEON_LIME }}
                    className="w-full text-black font-black text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                  >
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🔐 MODULAR AUTH MODAL COMPONENT */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          isDarkMode={isDarkMode}
          apiBaseUrl={API_BASE_URL}
          neonLime={NEON_LIME}
        />
      </div>
    </>
  );
}

// 🔑 ROOT EXPORT WRAPPED WITH GOOGLE OAUTH PROVIDER
export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GymCustomerApp />
    </GoogleOAuthProvider>
  );
}
