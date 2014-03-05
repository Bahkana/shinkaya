class ChatLinesController < ApplicationController
    before_filter :authenticate_user!

    def create
        @chat_line = ChatLine.new chat_line_params
        @chat_line.user = current_user

        respond_to do |format|
            if @chat_line.save
                format.html { render text: "Chat line was added" }
                format.js   {}
                format.json { render json: @chat_line, status: :created, location: @chat_line }
            else
                format.html { render text: ERB::Util.html_escape(@chat_line.errors.inspect) }
                format.json { render json: @chat_line.errors, status: :unprocessable_entity }
            end
        end
    end

    private

    def chat_line_params
        params.require(:chat_line).permit(:content)
    end
end
