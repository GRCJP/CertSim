/* Kindle Interactive App — high contrast, large tap targets */
html { font-size: 100%; }
body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.12rem;
  line-height: 1.5;
}
a { color: #000; }
#app { max-width: 42rem; margin: 0 auto; padding: 0.75rem 0.9rem 2.5rem; }
.brand {
  border-bottom: 2px solid #000;
  padding: 0.65rem 0;
  margin-bottom: 0.75rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.brand h1 { margin: 0; font-size: 1.05rem; }
.brand p { margin: 0.2rem 0 0; font-size: 0.85rem; }
.panel {
  border: 2px solid #000;
  padding: 0.9rem 1rem;
  margin: 0 0 0.85rem;
  background: #fff;
}
.panel h2 { margin: 0 0 0.5rem; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 1.35rem; }
.lead { margin: 0 0 0.85rem; }
.hint { font-size: 0.9rem; margin: 0.25rem 0 0.85rem; }
.meta { font-size: 0.85rem; font-family: "Helvetica Neue", Arial, sans-serif; margin-top: 1rem; }
.stats {
  display: block;
  border: 1px solid #000;
  padding: 0.5rem;
  margin: 0 0 1rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.stats div {
  display: inline-block;
  width: 46%;
  text-align: center;
  padding: 0.4rem 0;
}
.stats strong { display: block; font-size: 1.4rem; }
.stats span { font-size: 0.8rem; }
.btn {
  display: inline-block;
  border: 2px solid #000;
  background: #f2f2f2;
  color: #000;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  font-size: 1rem;
  padding: 0.85rem 1rem;
  margin: 0.25rem 0;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
}
.btn.block { display: block; width: 100%; box-sizing: border-box; }
.btn.primary { background: #000; color: #fff; }
.btn.ghost { background: #fff; font-weight: 600; }
.btn.small { padding: 0.45rem 0.65rem; font-size: 0.85rem; margin: 0; }
.btn:disabled { opacity: 0.4; }
.topbar {
  display: block;
  margin: 0 0 0.5rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.topbar .mode {
  display: inline-block;
  padding: 0.45rem 0.5rem;
  font-weight: 700;
}
.progressline {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 0.9rem;
  margin: 0 0 0.65rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid #000;
}
.scenario {
  border: 1px solid #000;
  padding: 0.5rem 0.7rem;
  margin: 0 0 0.85rem;
  background: #fafafa;
}
.scenario summary {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  cursor: pointer;
  padding: 0.25rem 0;
}
.stem { font-size: 1.05rem; margin: 0.5rem 0; }
.choices { margin: 0.75rem 0; }
.choice {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  border: 2px solid #000;
  background: #fff;
  color: #000;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.05rem;
  line-height: 1.4;
  padding: 0.85rem 0.9rem;
  margin: 0 0 0.55rem;
  cursor: pointer;
}
.choice .letter {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  margin-right: 0.35rem;
}
.choice.selected { background: #eaeaea; }
.choice.correct { background: #dcdcdc; border-width: 3px; font-weight: 700; }
.choice.wrong { background: #f5f5f5; text-decoration: line-through; }
.choice:disabled { cursor: default; }
.tag {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.05rem 0.35rem;
  border: 1px solid #000;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  vertical-align: middle;
}
.feedback {
  border: 2px solid #000;
  padding: 0.7rem 0.8rem;
  margin: 0.75rem 0;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
}
.feedback.ok { background: #e8e8e8; }
.feedback.bad { background: #fff; }
.explain {
  border: 1px solid #000;
  padding: 0.7rem 0.8rem;
  margin: 0.5rem 0 0;
  background: #f7f7f7;
}
.explain h3 {
  margin: 0 0 0.4rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 1rem;
}
.nav {
  margin-top: 0.75rem;
}
.nav .btn {
  width: 48%;
  box-sizing: border-box;
  display: inline-block;
}
.nav .btn.primary { float: right; }
.toc { list-style: none; padding: 0; margin: 0; }
.toc li {
  padding: 0.45rem 0;
  border-bottom: 1px solid #ccc;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 0.95rem;
}
.linkish {
  border: 1px solid #000;
  background: #f2f2f2;
  font-weight: 700;
  padding: 0.2rem 0.45rem;
  margin-left: 0.35rem;
  cursor: pointer;
}
.clearfix::after { content: ""; display: block; clear: both; }
@media (max-width: 480px) {
  .nav .btn { width: 100%; display: block; float: none; }
}
