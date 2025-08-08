import React, { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

const GoogleLoginButton = ({ onSuccess, onError, variant = "contained", fullWidth = true }) => {
  // Test Google OAuth configuration
  useEffect(() => {
    console.log("Google OAuth component mounted");
    console.log("Client ID configured:", "914537190439-7bvhvn8s9hbkt369cfq2cv8vvfkm59rh.apps.googleusercontent.com");
  }, []);

  const handleSuccess = async (credentialResponse) => {
    console.log("Google login successful, credential received:", credentialResponse);
    
    try {
      // Send the credential to your backend
      const res = await fetch("http://localhost:8000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          credential: credentialResponse.credential 
        }),
      });

      console.log("Server response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.msg || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Server response data:", data);
      
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/dashboard";
      } else {
        console.error("No token in response:", data);
        onError && onError(data.msg || "Google login failed - no token received");
      }
    } catch (err) {
      console.error("Google login error:", err);
      onError && onError(err.message || "Google login failed");
    }
  };

  const handleError = (error) => {
    console.error("Google OAuth error:", error);
    onError && onError("Google OAuth failed - please try again");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          theme="filled_blue"
          size="large"
          text="continue_with"
          shape="rectangular"
          width={fullWidth ? "100%" : "auto"}
        />
      </Box>
    </motion.div>
  );
};

export default GoogleLoginButton; 