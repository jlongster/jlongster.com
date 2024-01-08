const { height } = document.body.getBoundingClientRect();
const triggerY = (height * 0.8) | 0;
let initialScroll;

function onScroll() {
  if (window.localStorage.getItem('newsletterNotificationShown')) {
    return;
  }

  if (
    window.scrollY > triggerY &&
    Math.abs(window.scrollY - initialScroll) > 600
  ) {
    window.localStorage.setItem('newsletterNotificationShown', true);

    const div = document.createElement('div');
    div.className = 'newsletter-notification';
    div.innerHTML =
      '<div style="display: flex; align-items: center">' +
      '<a role="button" style="padding: 15px; padding-left: 5px; cursor: pointer">✖</a>' +
      '<div>' +
      'Hello! I hate to interrupt but if you like this content I have a ' +
      '<a target="_blank" href="https://buttondown.email/jlongster">newsletter</a> you may like. ❤' +
      '</div>' +
      '</div>';

    document.body.appendChild(div);

    const btns = div.querySelectorAll('a');
    [...btns].forEach(btn =>
      btn.addEventListener('click', e => {
        div.classList.remove('animated');
      }),
    );

    div.addEventListener('mouseover', e => {
      onUserInteracted();
    });

    div.addEventListener('touchstart', e => {
      onUserInteracted();
    });

    setTimeout(() => {
      div.classList.add('animated');

      div.addEventListener(
        'transitionend',
        () => {
          startTimer();
        },
        { once: true },
      );
    }, 0);

    let timer;
    let timerCleared = false;
    let userInteracted = false;

    function onUserInteracted() {
      if (userInteracted) {
        return;
      }

      userInteracted = true;
      clearTimeout(timer);
      div.classList.remove('ticktock');
      div.classList.add('animated');

      if (div.getAnimations().length > 0) {
        div.addEventListener(
          'transitionend',
          () => {
            div.classList.add('manual');
          },
          { once: true },
        );
      } else {
        div.classList.add('manual');
      }

      timerCleared = true;
    }

    function startTimer() {
      // If the user already hovered by this point, never start the timer
      if (!timerCleared) {
        div.classList.add('ticktock');

        timer = setTimeout(() => {
          div.classList.remove('animated');
        }, 5000);
      }
    }

    window.removeEventListener('scroll', onScroll);
  }
}

// Add a delay to allow any layout/scroll restoration to take place
// (we don't do any custom scroll restoration crap in our code, just
// the browser sometimes takes a bit)
setTimeout(() => {
  initialScroll = window.scrollY;
  window.addEventListener('scroll', onScroll);

  // Reset the initial scroll y if the user jumps to a link. This
  // avoiding spamming them immediately with the notification
  window.addEventListener('hashchange', () => {
    initialScroll = window.scrollY;
  })
}, 300);
