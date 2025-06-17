import React, { useState, useRef, useEffect } from 'react';
import { Button, message } from 'antd';
import { PlayCircleOutlined, DownloadOutlined } from '@ant-design/icons';

const VideoPlayer = ({ file }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const videoRef = useRef(null);

  // 生成静态文件URL
  const getStaticFileUrl = (file) => {
    // 从file.file_path中提取相对于uploads的路径
    let relativePath;
    
    if (file.file_path.includes('uploads')) {
      // 获取uploads之后的路径部分
      const uploadsIndex = file.file_path.indexOf('uploads');
      relativePath = file.file_path.substring(uploadsIndex + 8); // 8 = 'uploads/'.length
    } else {
      // 如果路径不包含uploads，假设是直接的文件名
      relativePath = `1/${file.file_path}`;
    }
    
    // 确保路径以正斜杠开头
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }
    
    // 移除多余的斜杠
    relativePath = relativePath.replace(/\/+/g, '/');
    
    const url = `http://localhost:3001/uploads${relativePath}`;
    console.log('生成的视频URL:', url);
    console.log('原始文件路径:', file.file_path);
    
    return url;
  };

  const videoUrl = getStaticFileUrl(file);

  // 检查浏览器支持的视频格式
  const checkVideoSupport = () => {
    const video = document.createElement('video');
    const formats = {
      'video/mp4': video.canPlayType('video/mp4'),
      'video/webm': video.canPlayType('video/webm'),
      'video/ogg': video.canPlayType('video/ogg'),
      'video/avi': video.canPlayType('video/avi'),
      'video/mov': video.canPlayType('video/mov'),
    };
    console.log('浏览器支持的视频格式:', formats);
    return formats;
  };

  useEffect(() => {
    checkVideoSupport();
  }, []);

  const handleVideoError = (e) => {
    console.error('视频播放错误:', e);
    const video = e.target;
    let errorMessage = '视频播放失败';
    let errorDetails = '';
    
    if (video.error) {
      console.log('视频Error对象:', video.error);
      switch (video.error.code) {
        case video.error.MEDIA_ERR_ABORTED:
          errorMessage = '视频播放被中止';
          errorDetails = '播放被用户或程序中止';
          break;
        case video.error.MEDIA_ERR_NETWORK:
          errorMessage = '网络错误';
          errorDetails = '网络连接问题，无法加载视频';
          break;
        case video.error.MEDIA_ERR_DECODE:
          errorMessage = '视频解码错误';
          errorDetails = '视频文件可能损坏或格式不支持';
          break;
        case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = '不支持的视频格式';
          errorDetails = '浏览器不支持此视频格式或MIME类型';
          break;
        default:
          errorMessage = '未知播放错误';
          errorDetails = `错误代码: ${video.error.code}`;
      }
    }
    
    setError({
      message: errorMessage,
      details: errorDetails,
      url: videoUrl,
      fileName: file.original_name,
      mimeType: file.mime_type
    });
  };

  const handleVideoLoad = () => {
    console.log('视频加载成功');
    if (videoRef.current) {
      const video = videoRef.current;
      setVideoInfo({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        canPlay: true
      });
    }
  };

  const handleLoadStart = () => {
    console.log('开始加载视频');
    setLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    console.log('视频可以播放');
    setLoading(false);
  };

  const handleDownload = () => {
    window.open(videoUrl, '_blank');
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (error) {
    return (
      <div style={{ 
        border: '1px dashed #d9d9d9', 
        borderRadius: '6px', 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#fafafa'
      }}>
        <div style={{ color: '#ff4d4f', marginBottom: '12px' }}>
          ⚠️ {error.message}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          详情: {error.details}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          文件: {error.fileName}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          MIME类型: {error.mimeType}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px', wordBreak: 'break-all' }}>
          路径: {error.url}
        </div>
        <div>
          <Button 
            type="primary" 
            size="small" 
            onClick={handleRetry}
            style={{ marginRight: '8px' }}
          >
            重试播放
          </Button>
          <Button 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={handleDownload}
          >
            下载文件
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px' }}>
      {loading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px'
        }}>
          正在加载视频...
        </div>
      )}
      <video
        ref={videoRef}
        controls
        style={{ 
          width: '100%', 
          maxHeight: '400px',
          backgroundColor: '#000',
          borderRadius: '4px'
        }}
        onError={handleVideoError}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onLoadedData={handleVideoLoad}
        preload="metadata"
        crossOrigin="anonymous"
      >
        <source src={videoUrl} type={file.mime_type} />
        <source src={videoUrl} type="video/mp4" />
        您的浏览器不支持视频播放。
      </video>
      <div style={{ 
        marginTop: '8px', 
        fontSize: '12px', 
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          {file.original_name} ({(file.file_size / 1024 / 1024).toFixed(2)} MB)
          {videoInfo && ` | ${Math.floor(videoInfo.duration / 60)}:${String(Math.floor(videoInfo.duration % 60)).padStart(2, '0')} | ${videoInfo.width}×${videoInfo.height}`}
        </span>
        <Button 
          size="small" 
          type="link"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
        >
          下载
        </Button>
      </div>
    </div>
  );
};

export default VideoPlayer; 