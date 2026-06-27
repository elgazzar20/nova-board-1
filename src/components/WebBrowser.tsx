import React from 'react';

export const WebBrowser = () => {
  return (
    <div className="flex-1 w-full h-full bg-white overflow-hidden">
      <iframe 
        src="https://www.bing.com" 
        className="w-full h-full border-none"
        title="Web Browser"
      />
    </div>
  );
};
