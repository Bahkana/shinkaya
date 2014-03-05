class CreateNewTableChatLines < ActiveRecord::Migration
    def change
        create_table :chat_lines do |t|
            t.string :content, null: false
            t.integer :user_id, null: false

            t.timestamps
        end
    end
end
