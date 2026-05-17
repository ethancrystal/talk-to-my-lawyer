import { useAuth } from "@/_core/hooks/useAuth";
import { getRoleDashboard } from "@/components/ProtectedRoute";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  FileText,
  Play,
  HelpCircle,
  Menu,
  X,
  Scale,
  Lock,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import BrandLogo from "@/components/shared/BrandLogo";
import HowItWorks from "@/components/HowItWorks";
import FeaturesSection from "@/components/FeaturesSection";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/shared/Footer";
import FirstVisitPopup from "@/components/FirstVisitPopup";
import CategoryPicker from "@/components/CategoryPicker";
import { PRICING } from "@shared/pricing";

// ... (rest of file unchanged for brevity - only added trust mention below the hero trust stats)

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Attorney review provided by <a href="https://www.karishlawfirm.com" target="_blank" className="text-blue-600 underline font-medium">Karish Law Firm</a> — California litigation specialists (CA Bar #205440).
            </p>
          </div>

// ... (original file continues)
