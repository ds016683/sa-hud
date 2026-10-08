// The Gateway: the first thing in the Morning Protocol is a song, chosen
// while the coffee is made. The library is David's and curated by hand.
// Entries: { title, artist, file?, url? }
//   file  a track David owns (DRM-free .m4a or .mp3) uploaded to the
//         project-files bucket at gateway/<file>; it plays in the HUD's own
//         player, which follows him through the protocol
//   url   an Apple Music (or other) link; tapping opens it there
// Empty list = the protocol asks what is playing and logs that.
export const GATEWAY_PLAYLIST = [
]
