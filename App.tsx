
import React, { useState, useEffect, useCallback } from 'react';
import { CameraDevice, StreamState } from './types';
import CameraFeed from './components/CameraFeed';

const App: React.FC = () => {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [activeTab, setActiveTab] = useState<'monitor' | 'settings'>('monitor');
  
  const [slot1, setSlot1] = useState<StreamState>({ stream: null, error: null, loading: false });
  const [slot2, setSlot2] = useState<StreamState>({ stream: null, error: null, loading: false });
  
  const [selectedId1, setSelectedId1] = useState<string>('');
  const [selectedId2, setSelectedId2] = useState<string>('');
  const [isMirrored1, setIsMirrored1] = useState<boolean>(true); // Usually front cam
  const [isMirrored2, setIsMirrored2] = useState<boolean>(false);

  const startStream = useCallback(async (deviceId: string, slot: 1 | 2) => {
    if (!deviceId) return;
    const setter = slot === 1 ? setSlot1 : setSlot2;
    setter(prev => ({ ...prev, loading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setter({ stream, error: null, loading: false });
    } catch (err: any) {
      console.error(`Error starting stream for slot ${slot}:`, err);
      setter({ stream: null, error: 'Could not open camera. It may be in use.', loading: false });
    }
  }, []);

  const initDevices = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setPermissionState('granted');
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 5)}`
        }));
      
      setDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        const id1 = videoDevices[0].deviceId;
        setSelectedId1(id1);
        startStream(id1, 1);
        
        if (videoDevices.length > 1) {
          const id2 = videoDevices[1].deviceId;
          setSelectedId2(id2);
          startStream(id2, 2);
        }
      }
      
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Permission denied or error:', err);
      setPermissionState('denied');
    }
  }, [startStream]);

  useEffect(() => {
    initDevices();
  }, [initDevices]);

  const stopStream = useCallback((slot: 1 | 2) => {
    const state = slot === 1 ? slot1 : slot2;
    const setter = slot === 1 ? setSlot1 : setSlot2;
    if (state.stream) state.stream.getTracks().forEach(track => track.stop());
    setter({ stream: null, error: null, loading: false });
  }, [slot1, slot2]);

  const handleToggleStream = (slot: 1 | 2) => {
    const state = slot === 1 ? slot1 : slot2;
    const deviceId = slot === 1 ? selectedId1 : selectedId2;
    state.stream ? stopStream(slot) : startStream(deviceId, slot);
  };

  const handleSnapshot = (slot: 1 | 2) => {
    const state = slot === 1 ? slot1 : slot2;
    if (!state.stream) return;
    const video = document.createElement('video');
    video.srcObject = state.stream;
    video.onloadedmetadata = () => {
      video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const link = document.createElement('a');
        link.download = `capture-${slot}-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-950 text-slate-200">
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <i className="fas fa-video text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">DualCam Vision</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold mt-1">Simultaneous Monitoring</p>
          </div>
        </div>

        {permissionState === 'granted' && (
          <nav className="flex space-x-1 bg-slate-800/50 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setActiveTab('monitor')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'monitor' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Monitor
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Hardware
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {permissionState === 'denied' ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <i className="fas fa-lock text-red-500 text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-white">Camera Access Blocked</h2>
            <p className="text-slate-400 leading-relaxed">
              We need permission to access your cameras to show the dual feeds. Please click the camera icon in your browser's address bar to reset permissions, then refresh the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-slate-900 font-bold py-4 px-8 rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center space-x-2"
            >
              <i className="fas fa-sync-alt"></i>
              <span>Refresh Page</span>
            </button>
          </div>
        ) : permissionState === 'prompt' ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto space-y-8 animate-pulse">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
              <i className="fas fa-camera text-blue-500 text-4xl"></i>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white">Initializing Devices</h2>
              <p className="text-slate-400">Please allow camera access when the browser prompt appears...</p>
            </div>
          </div>
        ) : activeTab === 'monitor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <CameraFeed stream={slot1.stream} label="Feed A" error={slot1.error} isLoading={slot1.loading} isMirrored={isMirrored1} />
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5 shadow-xl">
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleToggleStream(1)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${slot1.stream ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}>
                    <i className={`fas ${slot1.stream ? 'fa-pause' : 'fa-play'}`}></i>
                  </button>
                  <button onClick={() => handleSnapshot(1)} disabled={!slot1.stream} className="w-12 h-12 bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center hover:bg-slate-700 disabled:opacity-30">
                    <i className="fas fa-camera"></i>
                  </button>
                </div>
                <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mirror</span>
                  <button onClick={() => setIsMirrored1(!isMirrored1)} className={`w-9 h-5 rounded-full relative transition-colors ${isMirrored1 ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isMirrored1 ? 'left-5' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <CameraFeed stream={slot2.stream} label="Feed B" error={slot2.error} isLoading={slot2.loading} isMirrored={isMirrored2} />
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5 shadow-xl">
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleToggleStream(2)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${slot2.stream ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}>
                    <i className={`fas ${slot2.stream ? 'fa-pause' : 'fa-play'}`}></i>
                  </button>
                  <button onClick={() => handleSnapshot(2)} disabled={!slot2.stream} className="w-12 h-12 bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center hover:bg-slate-700 disabled:opacity-30">
                    <i className="fas fa-camera"></i>
                  </button>
                </div>
                <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mirror</span>
                  <button onClick={() => setIsMirrored2(!isMirrored2)} className={`w-9 h-5 rounded-full relative transition-colors ${isMirrored2 ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isMirrored2 ? 'left-5' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 rounded-3xl p-8 md:p-12 border border-white/5 max-w-4xl mx-auto shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-10 flex items-center">
              <i className="fas fa-sliders-h mr-4 text-blue-500"></i>
              Hardware Assignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <label className="block space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Primary Source</span>
                  <select value={selectedId1} onChange={(e) => { setSelectedId1(e.target.value); stopStream(1); }} className="w-full bg-slate-800 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    {devices.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="space-y-6">
                <label className="block space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Secondary Source</span>
                  <select value={selectedId2} onChange={(e) => { setSelectedId2(e.target.value); stopStream(2); }} className="w-full bg-slate-800 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    <option value="">(None)</option>
                    {devices.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-16 pt-8 border-t border-white/5 flex justify-center">
              <button onClick={() => { setActiveTab('monitor'); startStream(selectedId1, 1); startStream(selectedId2, 2); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center space-x-3">
                <i className="fas fa-check-circle"></i>
                <span>Save & Start Feeds</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="p-8 border-t border-white/5 bg-slate-900/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm">
          <p>© 2024 DualCam Vision • Secure P2P Processing</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="flex items-center"><i className="fas fa-check-circle text-green-500 mr-2"></i> Latency Optmized</span>
            <span className="flex items-center"><i className="fas fa-lock text-blue-500 mr-2"></i> Browser Native</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
