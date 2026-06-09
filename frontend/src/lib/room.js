import { supabase } from "./supabase.js";

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

export async function getAllUsers() {
  const { data } = await supabase.from("users").select("*");
  return data || [];
}

export async function startReview(album) {
  const { data: existing } = await supabase
    .from("reviews")
    .select("*")
    .eq("album_id", album.id)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("reviews")
    .insert({
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

export async function getAllReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
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

export async function toggleDisagree(reviewId, trackId, userId) {
  const { data: existing } = await supabase
    .from("disagrees")
    .select("*")
    .eq("review_id", reviewId)
    .eq("track_id", trackId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase.from("disagrees").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("disagrees").insert({
      review_id: reviewId,
      track_id: trackId,
      user_id: userId,
    });
    return true;
  }
}

export async function getDisagrees(reviewId) {
  const { data, error } = await supabase
    .from("disagrees")
    .select("*")
    .eq("review_id", reviewId);

  if (error) throw error;
  return data || [];
}
