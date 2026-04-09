

export function send_html(content: string){
    return new Response(content, {
        headers: {
            "Content-Type": "text/html"
        }
    })
}