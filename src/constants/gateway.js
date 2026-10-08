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
  // West World · a playlist by Dacia Smith (Apple Music pl.u-xRx2FkG7V7K), pulled 10/8
  { title: 'Heart-Shaped Box (Orchestral)', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/heart-shaped-box-orchestral/1454594548?i=1454594890', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e4/fb/0c/e4fb0c92-4c00-c9df-46f7-6f41ebc9d948/mzaf_1889420854898529894.plus.aac.p.m4a' },
  { title: 'Paint It, Black', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/paint-it-black/1454594548?i=1454595003', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/27/bf/7e/27bf7eeb-b32a-0306-830f-a37ebf37d0c6/mzaf_5393996259895419275.plus.aac.p.m4a' },
  { title: 'Heart-Shaped Box (Piano)', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/heart-shaped-box-piano/1454594548?i=1454595110', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/55/14/34/551434e9-481e-19a7-7d7f-ccee8bbb4827/mzaf_11566541499667297350.plus.aac.p.m4a' },
  { title: 'Take My Heart When You Go', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/take-my-heart-when-you-go/1454594548?i=1454595241', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b2/f5/60/b2f5608e-0087-5565-03dc-b9ae8986846d/mzaf_16912455296994755802.plus.aac.p.m4a' },
  { title: 'My Favorite', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/my-favorite/1454594548?i=1454595246', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/39/5d/ad/395dad05-9dd6-ee61-8cb4-8acd65a144bc/mzaf_14010779447098468472.plus.aac.p.m4a' },
  { title: 'Vanishing Point', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/vanishing-point/1454594548?i=1454595251', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/38/bd/bc/38bdbc58-58d0-2b8f-e887-8ba749edabbf/mzaf_6358841425570214061.plus.aac.p.m4a' },
  { title: 'My Speech', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/my-speech/1454594548?i=1454595254', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/1c/71/42/1c7142ad-0065-cee1-e8f2-8c4dfc9440c3/mzaf_13504829613438548867.plus.aac.p.m4a' },
  { title: 'I Promise', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/i-promise/1454594548?i=1454595260', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/85/a5/74/85a57402-5e8e-38cf-71d2-51c2956f38f7/mzaf_12095287785318790426.plus.aac.p.m4a' },
  { title: 'Westworld', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/westworld/1454594548?i=1454595331', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4a/f6/74/4af6740c-eb72-3f12-05a2-de36a3818c9f/mzaf_6275499311022147323.plus.aac.p.m4a' },
  { title: 'The Day the World Went Away', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/the-day-the-world-went-away/1638024567?i=1638024576', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/be/65/41/be6541d9-42b6-5ccd-8d1f-1f5fc07b9618/mzaf_4591211371995755081.plus.aac.p.m4a' },
  { title: 'Caleb', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/caleb/1511001397?i=1511001403', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ac/6e/2c/ac6e2cfa-dfbe-ebe3-5682-06da2c61fb76/mzaf_4617993250454079307.plus.aac.p.m4a' },
  { title: 'Rehoboam', artist: 'Ramin Djawadi', url: 'https://music.apple.com/us/album/rehoboam/1511001397?i=1511001404', preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a5/3a/69/a53a697f-6fbf-6941-5071-1995c3e29bc4/mzaf_4048005226944123855.plus.aac.p.m4a' },
]
