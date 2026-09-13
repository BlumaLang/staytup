import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Check, ListPlus, FolderPlus } from 'lucide-react';

export const PlaylistSheet = ({ track, isOpen, onClose }) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addedMap, setAddedMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const userId = user?.id || localStorage.getItem('staytup_user_id') || 'guest_user';

  useEffect(() => {
    if (!isOpen || !userId) return;
    setIsLoading(true);
    api.getPlaylists(userId)
      .then(res => {
        if (Array.isArray(res)) setPlaylists(res);
        else if (res && Array.isArray(res.playlists)) setPlaylists(res.playlists);
      })
      .catch(err => console.warn('Could not fetch playlists:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const res = await api.createPlaylist({
        user_id: userId,
        name: newPlaylistName.trim(),
        description: 'Created on Staytup',
        tracks: track ? [track] : [],
      });
      if (res?.playlist) {
        setPlaylists(prev => [res.playlist, ...prev]);
        setNewPlaylistName('');
        setIsCreating(false);
        if (track) {
          setAddedMap(prev => ({ ...prev, [res.playlist.id]: true }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!track) return;
    try {
      await api.addTrackToPlaylist(playlistId, userId, track);
      setAddedMap(prev => ({ ...prev, [playlistId]: true }));
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (e) {
      console.error(e);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
      <div className="w-full sm:max-w-md bg-[#121212] border-t border-[#2C2C2E] sm:border sm:rounded-3xl rounded-t-3xl pt-7 pb-6 px-6 text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1C1C1E] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-white">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add to Playlist</h3>
              <p className="text-xs text-[#8E8E93] line-clamp-1">{track?.title || 'Select a playlist'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create inline button or form */}
        {isCreating ? (
          <form onSubmit={handleCreate} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                autoFocus
                className="flex-1 px-4 py-2.5 bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#8E8E93] text-sm focus:outline-none focus:border-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-gray-200"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2.5 rounded-xl bg-[#1C1C1E] text-[#8E8E93] text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full mb-4 py-3 px-4 rounded-xl bg-[#1C1C1E] hover:bg-[#252528] border border-dashed border-[#2C2C2E] flex items-center justify-center gap-2 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
        )}

        {/* Playlists list */}
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1">
          {isLoading ? (
            <div className="py-8 text-center text-[#8E8E93] text-xs">Loading playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="py-8 text-center text-[#8E8E93] text-xs">
              No playlists found. Create your first one above!
            </div>
          ) : (
            playlists.map((pl) => {
              const isAdded = !!addedMap[pl.id];
              return (
                <div
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1C1C1E] hover:bg-[#252528] border border-transparent hover:border-[#2C2C2E] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2C2C2E] overflow-hidden flex items-center justify-center text-[#8E8E93]">
                      {pl.cover_url ? (
                        <img src={pl.cover_url} alt={pl.name} className="w-full h-full object-cover" />
                      ) : (
                        <FolderPlus className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{pl.name}</p>
                      <p className="text-xs text-[#8E8E93]">{pl.track_count || pl.tracks?.length || 0} tracks</p>
                    </div>
                  </div>

                  {isAdded ? (
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-4 h-4 text-black stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93]">
                      <Plus className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
