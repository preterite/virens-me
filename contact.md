---
layout: default
title: Contact
description: "Get in touch"
---

# Contact

Get in touch via the form below or through email.

<div class="card">
  <h3>Email</h3>
  <div class="contact-methods">
    <p><em>Click below to reveal email addresses:</em></p>
  </div>
  <button onclick="revealEmails()" class="button">Show Email Addresses</button>
</div>

<div class="card">
  <h3>Contact Form</h3>
  <form id="contact-form" method="POST" action="https://formspree.io/f/YOUR_FORM_ID">
    <div style="margin-bottom: 16px;">
      <label for="email">Your Email:</label>
      <input type="email" id="email" name="email" required>
    </div>
    
    <div style="margin-bottom: 16px;">
      <label for="message">Message:</label>
      <textarea id="message" name="message" rows="6" required></textarea>
    </div>
    
    <!-- Honeypot -->
    <div style="position:absolute;left:-5000px;" aria-hidden="true">
      <input type="text" name="website_url" tabindex="-1" autocomplete="off">
    </div>
    
    <input type="hidden" name="timestamp" id="timestamp">
    
    <button type="submit" class="button">Send Message</button>
  </form>
</div>
