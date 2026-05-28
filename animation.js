git /* animation.js - Detailed 2D SVG Animation */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('animationContainer');
  if (!container) return;

  const svgChar = '<svg viewBox="0 0 180 360" class="svg-char">' +
    '<g class="svg-char-group">' +
      '<circle cx="90" cy="60" r="30" class="char-body" />' +
      '<rect x="67.5" y="105" width="45" height="105" rx="22.5" class="char-body" />' +
      '<g class="leg-right"><rect x="-10" y="0" width="20" height="90" rx="10" class="char-limb-back" /></g>' +
      '<g class="leg-left"><rect x="-10" y="0" width="20" height="90" rx="10" class="char-body" /></g>' +
      '<g class="arm-right"><rect x="-9" y="0" width="18" height="75" rx="9" class="char-limb-back" /></g>' +
      '<g class="arm-left"><rect x="-9" y="0" width="18" height="75" rx="9" class="char-limb-front" /></g>' +
    '</g>' +
  '</svg>';

  const receptionistSvg = '<svg viewBox="0 0 180 360" class="svg-char">' +
    '<g class="svg-char-group">' +
      '<circle cx="90" cy="60" r="30" class="char-accent" />' +
      '<rect x="67.5" y="105" width="45" height="105" rx="22.5" class="char-accent" />' +
      '<g class="arm-right"><rect x="-9" y="0" width="18" height="75" rx="9" class="char-limb-back" /></g>' +
      '<g class="arm-left"><rect x="-9" y="0" width="18" height="75" rx="9" class="char-accent" /></g>' +
    '</g>' +
  '</svg>';

  const html = '<div class="anim-wrapper"><div class="anim-inner">' +
    '<!-- Scene 1 & 2: Lobby -->' +
    '<div class="anim-scene" id="scene1">' +
      '<div class="anim-lobby">' +
        '<div class="anim-desk"></div>' +
        '<div class="anim-computer"></div>' +
        '<div class="anim-receptionist" id="animRec">' + receptionistSvg + '</div>' +
        '<div class="anim-client walking" id="animClient">' + svgChar + '</div>' +
        '<div class="anim-card" id="animCard"></div>' +
        '<div class="anim-screen-zoom" id="animScreen">' +
          '<div style="color:#aaa; font-size:1.3rem; margin-bottom:22px; border-bottom:1px solid #333; padding-bottom:15px;">T-TECH GUEST SYSTEM v2.0</div>' +
          '<div id="animTyping" class="anim-typing"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<!-- Scene 3: Hallway & Door -->' +
    '<div class="anim-scene" id="scene2">' +
      '<div class="anim-hallway">' +
        '<div class="anim-elevator">' +
          '<div class="anim-elevator-doors" id="animElevatorDoors"></div>' +
          '<div class="anim-floor-display" id="animFloor">1</div>' +
        '</div>' +
        '<div class="anim-door" id="animDoor">' +
          '<div class="anim-door-lock-svg" id="animLock">' +
            '<div class="lock-body"></div>' +
            '<div class="lock-shackle"></div>' +
            '<div class="lock-light"></div>' +
          '</div>' +
        '</div>' +
        '<div class="anim-client-door walking" id="animClientDoor">' +
          svgChar +
          '<div class="anim-card-use"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<!-- Scene 4: Room -->' +
    '<div class="anim-scene" id="scene3">' +
      '<div class="anim-room">' +
        '<div class="anim-window" id="animWindow">' +
          '<div class="anim-sun"></div>' +
          '<div class="anim-curtain-l" id="animCurtainL"><div class="fold"></div><div class="fold"></div><div class="fold"></div><div class="fold"></div></div>' +
          '<div class="anim-curtain-r" id="animCurtainR"><div class="fold"></div><div class="fold"></div><div class="fold"></div><div class="fold"></div></div>' +
        '</div>' +
        '<div class="anim-phone-desk">' +
          '<div class="anim-phone-obj">' +
            '<div class="phone-base"></div><div class="phone-handset"></div>' +
          '</div>' +
        '</div>' +
        '<div class="anim-client-room walking" id="animClientRoom">' +
          svgChar +
          '<div class="anim-remote" id="animRemote"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<!-- Scene 5: Split Screen -->' +
    '<div class="anim-scene" id="scene4">' +
      '<div class="anim-split">' +
        '<div class="anim-split-left">' +
          '<div class="anim-bubble" id="bubbleClient">Everything is perfect, thank you!</div>' +
          '<div class="anim-client-split" id="animClientSplit">' + svgChar + '</div>' +
        '</div>' +
        '<div class="anim-split-right">' +
          '<div class="anim-bubble" id="bubbleRec">Happy to help.</div>' +
          '<div class="anim-rec-split" id="animRecSplit">' + receptionistSvg + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<!-- Scene 6: Outro -->' +
    '<div class="anim-scene" id="scene5">' +
      '<div class="anim-outro" id="animOutro">' +
        '<h2><span>E</span>PICOM</h2>' +
        '<p>Your trusted security installation partner.</p>' +
      '</div>' +
    '</div>' +
  '</div></div>';

  container.innerHTML = html;

  const wrapper = container.querySelector('.anim-wrapper');
  const inner = container.querySelector('.anim-inner');
  const resizeAnim = () => {
    if (wrapper && inner) {
      const scale = wrapper.clientWidth / 1280;
      inner.style.transform = `scale(${scale})`;
    }
  };
  window.addEventListener('resize', resizeAnim);
  resizeAnim();

  let hasPlayed = false;
  
  const observer = new IntersectionObserver((entries) => {
    if(entries[0].isIntersecting && !hasPlayed) {
      hasPlayed = true;
      playAnimation();
    }
  }, { threshold: 0.5 });
  
  observer.observe(container);

  function playAnimation() {
    const s1 = document.getElementById('scene1');
    const s2 = document.getElementById('scene2');
    const s3 = document.getElementById('scene3');
    const s4 = document.getElementById('scene4');
    const s5 = document.getElementById('scene5');

    // SCENE 1: Lobby (0 - 8s)
    s1.classList.add('active');
    setTimeout(() => {
      document.getElementById('animClient').classList.add('walk-in');
    }, 200);

    // Stop walking at desk
    setTimeout(() => {
      document.getElementById('animClient').classList.remove('walking');
    }, 4500);

    // Show screen typing
    setTimeout(() => {
      document.getElementById('animScreen').classList.add('show');
      typeText("Adding Client...\\nName: John Doe\\nRoom: 402\\nStatus: Access Granted", document.getElementById('animTyping'), 60);
    }, 5000);

    // Hide screen and hand over card
    setTimeout(() => {
      document.getElementById('animScreen').classList.remove('show');
      document.getElementById('animRec').querySelector('.arm-left').classList.add('reach');
      document.getElementById('animCard').classList.add('give');
    }, 8500);

    // Client reaches for card
    setTimeout(() => {
      document.getElementById('animClient').querySelector('.arm-right').classList.add('reach');
    }, 9000);

    // SCENE 2: Hallway & Door (10.5 - 16s)
    setTimeout(() => {
      s1.classList.remove('active');
      s2.classList.add('active');
      
      // Elevator sequence
      let floor = 1;
      const fDisplay = document.getElementById('animFloor');
      const fInterval = setInterval(() => { floor++; fDisplay.innerText = floor; if(floor>=4) clearInterval(fInterval); }, 400);

      setTimeout(() => {
        document.getElementById('animElevatorDoors').classList.add('open');
      }, 1600);

      setTimeout(() => {
        document.getElementById('animClientDoor').classList.add('show');
        document.getElementById('animClientDoor').classList.add('walk-door');
      }, 2500);
      
      setTimeout(() => {
        document.getElementById('animClientDoor').classList.remove('walking');
        document.getElementById('animClientDoor').classList.add('use-card');
      }, 6000);

      setTimeout(() => {
        document.getElementById('animLock').classList.add('unlocked');
      }, 7000);

      setTimeout(() => {
        document.getElementById('animDoor').classList.add('open');
      }, 7500);
    }, 10500);

    // SCENE 3: Room & Curtains (18.5 - 24s)
    setTimeout(() => {
      s2.classList.remove('active');
      s3.classList.add('active');
      
      setTimeout(() => {
        document.getElementById('animClientRoom').classList.add('walk-in');
      }, 500);

      setTimeout(() => {
        document.getElementById('animClientRoom').classList.remove('walking');
        document.getElementById('animClientRoom').classList.add('use-remote');
      }, 3500);

      setTimeout(() => {
        document.getElementById('animWindow').classList.add('morning');
        document.getElementById('animCurtainL').parentElement.classList.add('anim-curtains-open');
      }, 4000);
    }, 18500);

    // SCENE 4: Split Screen Phone Call (24 - 28s)
    setTimeout(() => {
      s3.classList.remove('active');
      s4.classList.add('active');
      
      document.getElementById('animClientSplit').querySelector('.arm-right').classList.add('phone');
      document.getElementById('animRecSplit').querySelector('.arm-left').classList.add('headset');

      setTimeout(() => {
        document.getElementById('bubbleClient').classList.add('show');
      }, 1000);
      setTimeout(() => {
        document.getElementById('bubbleRec').classList.add('show');
      }, 2500);
    }, 24000);

    // SCENE 5: Outro (28s+)
    setTimeout(() => {
      s4.classList.remove('active');
      s5.classList.add('active');
      setTimeout(() => {
        document.getElementById('animOutro').classList.add('show');
      }, 200);
    }, 28500);
  }

  function typeText(text, el, speed) {
    let i = 0;
    el.innerHTML = "";
    const interval = setInterval(() => {
      el.innerHTML = text.substring(0, i).replace(/\\n/g, '<br>');
      i++;
      if (i > text.length) clearInterval(interval);
    }, speed);
  }
});
