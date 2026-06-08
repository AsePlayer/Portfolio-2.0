document.addEventListener('DOMContentLoaded', function(){
  // Year
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // Nav toggle for small screens
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');
  if(navToggle && nav){
    navToggle.addEventListener('click', function(){
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open');
    });
  }

  // Smooth in-page links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){
      const target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  // Contact form -> mailto
  const form = document.getElementById('contact-form');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const name = encodeURIComponent(form.name.value.trim());
      const email = encodeURIComponent(form.email.value.trim());
      const message = encodeURIComponent(form.message.value.trim());
      const subject = encodeURIComponent('Website contact from ' + (form.name.value || 'Website'));
      const body = encodeURIComponent('Name: ')+name+encodeURIComponent('\nEmail: ')+email+encodeURIComponent('\n\n')+message;
      window.location.href = `mailto:ryan@example.com?subject=${subject}&body=${body}`;
    });
  }
});
