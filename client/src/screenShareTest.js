// Screen Sharing Test Utility
// This file can be used to test screen sharing functionality independently

export const testScreenSharing = async () => {
  console.log('🧪 Testing screen sharing functionality...');
  
  try {
    // Test 1: Check if getDisplayMedia is available
    if (!navigator.mediaDevices.getDisplayMedia) {
      console.error('❌ getDisplayMedia not supported');
      return false;
    }
    console.log('✅ getDisplayMedia is supported');
    
    // Test 2: Try to get display media
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'monitor'
      },
      audio: false
    });
    
    console.log('✅ Successfully got display stream');
    console.log('📹 Display stream tracks:', displayStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    
    // Test 3: Check if we can create a combined stream
    const combinedStream = new MediaStream();
    const screenVideoTrack = displayStream.getVideoTracks()[0];
    if (screenVideoTrack) {
      combinedStream.addTrack(screenVideoTrack);
      console.log('✅ Added screen video track to combined stream');
    }
    
    // Test 4: Check if we can get user media for audio
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = userStream.getAudioTracks()[0];
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
        console.log('✅ Added audio track to combined stream');
      }
      userStream.getTracks().forEach(track => track.stop());
    } catch (audioError) {
      console.warn('⚠️ Could not get audio stream:', audioError.message);
    }
    
    console.log('📹 Combined stream tracks:', combinedStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    
    // Test 5: Test track replacement (simulate what happens in peer connections)
    const videoTrack = combinedStream.getVideoTracks()[0];
    if (videoTrack) {
      console.log('✅ Video track available for replacement');
      console.log('📊 Video track settings:', videoTrack.getSettings());
    }
    
    // Cleanup
    displayStream.getTracks().forEach(track => track.stop());
    combinedStream.getTracks().forEach(track => track.stop());
    
    console.log('✅ Screen sharing test completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Screen sharing test failed:', error);
    return false;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testScreenSharing = testScreenSharing;
} 