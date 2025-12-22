import React, { useState } from "react";
import { AutoResizeTextarea } from "@/components/ui/textarea";

const TestTextareaPage = () => {
  const [text, setText] = useState("");
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Auto-Resizing Textarea Demo</h1>
      
      <div className="mb-6">
        <label htmlFor="demo-textarea" className="block text-sm font-medium mb-2">
          Auto-resizing Textarea:
        </label>
        <div className="border p-4 rounded-lg">
          <AutoResizeTextarea
            id="demo-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type here to see the auto-resizing in action..."
            maxHeight={300}
            minWidth={200}
            maxWidth={600}
            className="w-full"
          />
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Type text to see the textarea automatically adjust its height</li>
          <li>Try adding long lines to see width adjustments</li>
          <li>Resize your browser window to see responsive behavior</li>
          <li>The textarea will respect min/max width constraints</li>
        </ul>
      </div>
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Current Text:</h2>
        <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">{text || "(empty)"}</pre>
      </div>
    </div>
  );
};

export default TestTextareaPage;