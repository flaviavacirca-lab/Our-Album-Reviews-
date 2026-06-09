import { supabase } from "./supabase.js";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function ensureUser(spotifyProfile) {
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("spotify_id", spotifyProfile.id)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("users")
    .insert({
      spotify_id: spotifyProfile.id,
      display_name: spotifyProfile.display_name,
      avatar_url: spotifyProfile.images?.[0]?.url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createRoom(userId) {
  const code = generateCode();
  const { data, error } = await supabase
    .from("rooms")
    .insert({ code, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function joinRoom(code, userId) {
  const { data: room, error: findErr } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (findErr || !room) throw new Error("Room not found");
  if (room.created_by === userId) return room;
  if (room.partner_id && room.partner_id !== userId) throw new Error("Room is full");

  if (!room.partner_id) {
    const { data, error } = await supabase
      .from("rooms")
      .update({ partner_id: userId })
      .eq("id", room.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  return room;
}

export async function getUserRooms(userId) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .or(`created_by.eq.${userId},partner_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function startReview(roomId, album) {
  const { data: existing } = await supabase
    .from("reviews")
    .select("*")
    .eq("room_id", roomId)
    .eq("album_id", album.id)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      room_id: roomId,
      album_id: album.id,
      album_name: album.name,
      artist_name: album.artists.map((a) => a.name).join(", "),
      album_image: album.images?.[0]?.url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRoomReviews(roomId) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("room_id", roomId)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertScore(reviewId, userId, track, scores) {
  const { data, error } = await supabase
    .from("scores")
    .upsert(
      {
        review_id: reviewId,
        user_id: userId,
        track_id: track.id,
        track_name: track.name,
        track_number: track.track_number,
        ...scores,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "review_id,user_id,track_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReviewScores(reviewId) {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("review_id", reviewId)
    .order("track_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function markReviewComplete(reviewId) {
  const { error } = await supabase
    .from("reviews")
    .update({ completed: true })
    .eq("id", reviewId);

  if (error) throw error;
}
