class MainController < ApplicationController
    before_filter :authenticate_user!

    def index
        @chat_lines = ChatLine.all
    end
end
