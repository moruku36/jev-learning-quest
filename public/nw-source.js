(async()=>{
const host=document.getElementById('citation');
try{
 const all=await fetch('/nw-citations.json').then(r=>{if(!r.ok)throw Error();return r.json();});
 const q=all.find(q=>q.id===new URLSearchParams(location.search).get('id'));
 if(!q)throw Error();
 for(const value of [q.sourceLabel,`問題PDFの物理ページ: ${q.pdfPages.join(', ')} / 解答PDFの物理ページ: ${q.answerPages.join(', ')}`,q.modification,'出典: 独立行政法人情報処理推進機構（IPA）。第三者の権利を含む部分には別の条件が適用される場合があります。二次サイトの解説は転載していません。','午後の採点は公式解答例を参照する自己採点であり、試験の公式得点ではありません。',...(q.invalidNotice?[q.invalidNotice]:[])]){const p=document.createElement('p');p.textContent=value;host.append(p);}
 host.firstChild.remove();
 for(const [label,url]of [['IPA掲載ページ',q.sourceUrl],['IPA問題PDF',`${q.questionPdf}#page=${q.pdfPages[0]}`],['IPA解答・解答例PDF',`${q.answerPdf}#page=${q.answerPages[0]}`],['IPAサイト利用条件','https://www.ipa.go.jp/siteinfo.html']]){const p=document.createElement('p');const a=document.createElement('a');a.className='run-link';a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);host.append(p);}
}catch{host.textContent='出典を読み込めませんでした。学習画面から問題を選び直してください。';}
})();