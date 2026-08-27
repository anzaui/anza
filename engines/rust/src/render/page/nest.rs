pub fn wrap_dsd(tag: &str, inner_html: &str, shadow_content: &str) -> String {
  format!(
    "<{tag}><template shadowrootmode=\"open\">{shadow}</template>{inner}</{tag}>",
    tag = tag,
    shadow = shadow_content,
    inner = inner_html
  )
}
