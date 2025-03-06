let videos = [...document.querySelectorAll('video')];

for (let video of videos) {
  video.addEventListener('play', () => {
    for (let v of videos) {
      if (v !== video) {
        v.pause();
      }
    }
  });
}

for (let playButton of document.querySelectorAll('.tweet-play-button')) {
  playButton.addEventListener('click', e => {
    const btn = e.currentTarget;
    const video = e.currentTarget.previousSibling;

    e.preventDefault();
    btn.style.display = 'none';

    video.controls = true;
    video.load();
    video
      .play()
      .then(() => {
        video.focus();
      })
      .catch(error => {
        console.error('Error playing video:', error);
        btn.style.display = 'block';
      });

    btn.parentNode.querySelector('.tweet-watch-on-twitter').style.display =
      'none';
  });
}
