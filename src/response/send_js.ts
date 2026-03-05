export function send_js(content: string){
    return new Response(content, {
        headers: {
            "Content-Type": "text/javascript"
        }
    })
}