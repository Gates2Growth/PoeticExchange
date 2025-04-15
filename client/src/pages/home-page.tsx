import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [_, navigate] = useLocation();
  
  // Redirect to poems library by default
  useEffect(() => {
    navigate("/poems");
  }, [navigate]);
  
  return null;
}
