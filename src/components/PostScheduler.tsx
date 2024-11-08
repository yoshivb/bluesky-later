import React, { useState } from 'react';
import { Calendar, Clock, Send } from 'lucide-react';
import { db } from '../lib/db';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ImageUpload } from './ImageUpload';

export function PostScheduler() {
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [image, setImage] = useState<{ url: string; type: string; alt: string } | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content || !scheduledDate || !scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledFor < new Date()) {
      toast.error('Cannot schedule posts in the past');
      return;
    }

    try {
      await db.posts.add({
        content,
        scheduledFor,
        status: 'pending',
        createdAt: new Date(),
        image: image,
      });
      
      toast.success('Post scheduled successfully!');
      setContent('');
      setScheduledDate('');
      setScheduledTime('');
      setImage(undefined);
    } catch (error) {
      toast.error('Failed to schedule post');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Schedule New Post</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
            placeholder="What's on your mind?"
            maxLength={300}
          />
          <p className="text-sm text-gray-500 mt-1">
            {300 - content.length} characters remaining
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image (optional)
          </label>
          <ImageUpload
            onImageSelect={setImage}
            onImageClear={() => setImage(undefined)}
            selectedImage={image}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="h-5 w-5" />
          Schedule Post
        </button>
      </form>
    </div>
  );
}