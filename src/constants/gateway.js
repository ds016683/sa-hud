// The Gateway: the first thing in the Morning Protocol is a song, chosen
// while the coffee is made. The library is David's and curated by hand.
// Entries: { title, artist, url?, file?, preview? }
//   file  a track David owns (DRM-free .m4a or .mp3) uploaded to the
//         project-files bucket at gateway/<file>; it plays in the HUD's own
//         player, which follows him through the protocol
//   url   an Apple Music (or other) link; tapping opens it there
//   preview  Apple's 30-second preview clip for the track, so the player has
//         something to play before the owned file arrives
// Empty list = the protocol asks what is playing and logs that.
export const GATEWAY_PLAYLIST = [
  { title: 'The Trial of the Bow / Vengeance', artist: 'Ludwig Göransson', url: 'https://music.apple.com/us/album/the-trial-of-the-bow-vengeance/6789293451?i=6789293874', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f9/3a/47/f93a47cc-da02-b7a1-24e1-2c9817966678/mzaf_8915517022242118523.plus.aac.ep.m4a' },
]
